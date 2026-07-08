"use client";

import { useEffect, useState } from "react";
import { findCertLevel } from "@/lib/assessment-mapping";
import { CMETA, PRODUCTS, getVisibleCerts } from "@/lib/academy-data";
import type { User } from "@/lib/auth";
import {
  formatPersonalBestScore,
  getCertificationsEarnedCount,
  type CertificationModule,
} from "@/lib/certifications";
import { countModulesCovered, type DoneRecord, type ProgressSnapshot } from "@/lib/progress";
import { apiUrl } from "@/lib/api";
import {
  fetchSyllabusByProduct,
  getModuleCountForCert,
  type SyllabusByProduct,
} from "@/lib/syllabus-progress";

type DashboardPageProps = {
  user: User;
};

export default function DashboardPage({ user }: DashboardPageProps) {
  const [progress, setProgress] = useState<ProgressSnapshot>({
    scores: [],
    done: {},
  });
  const [syllabusByProduct, setSyllabusByProduct] = useState<SyllabusByProduct>({});
  const [syllabusLoading, setSyllabusLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      try {
        const response = await fetch(apiUrl(`/api/firebase/user-progress/${encodeURIComponent(user.id)}`));

        if (!response.ok) {
          throw new Error("Failed to fetch progress.");
        }

        const data = (await response.json()) as ProgressSnapshot;

        if (!cancelled) {
          setProgress({
            scores: Array.isArray(data.scores) ? data.scores : [],
            done: typeof data.done === "object" && data.done ? (data.done as DoneRecord) : {},
          });
        }
      } catch (error) {
        if (!cancelled) {
          setProgress({
            scores: [],
            done: {},
          });
        }
      } finally {
        if (!cancelled) {
          setProgressLoading(false);
        }
      }
    }

    loadProgress();
    fetchSyllabusByProduct().then((data) => {
      if (!cancelled) {
        setSyllabusByProduct(data);
        setSyllabusLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const certifications = Array.isArray(user.certifications)
    ? (user.certifications as CertificationModule[])
    : [];
  const certificationsEarned = getCertificationsEarnedCount(certifications);
  const personalBestScore = formatPersonalBestScore(certifications);
  const userDone = progress.done;

  let totalModules = 0;
  let totalProgressEntries = 0;
  const progressByProduct = PRODUCTS.map((product) => {
    const visibleCerts = getVisibleCerts(user.team, product.certs);
    const certRows = visibleCerts.map((certId) => {
      const certDone = Object.keys(userDone).filter((key) =>
        key.startsWith(`${product.id}-`) && key.endsWith(`-${certId}`)
      ).length;
      const certTotal = getModuleCountForCert(product.id, certId, syllabusByProduct, product.moduleCount);
      totalProgressEntries += certDone;
      return { certId, certDone, certTotal };
    });
    totalModules += certRows.reduce((sum, row) => sum + row.certTotal, 0);
    return { product, certRows, visibleCerts };
  });

  const isLoading = syllabusLoading || progressLoading;

  const firstName = user.name.split(" ")[0];
  const personaLevels = getVisibleCerts(user.team, ["pathfinder", "navigator", "grandmaster"])
    .map((certId) => CMETA[certId].name)
    .join(" → ");

  return (
    <div id="pg-dash">
      <div className="ph">
        <h2>{`Welcome back, ${firstName} 👋`}</h2>
        <p className="dash-subtitle">
          <span>Your program:</span>
          <span className="team-pill">{user.team}</span>
          <span>→ Certifications:</span>
          <span>{personaLevels || "PathFinder"}</span>
        </p>
      </div>

      <div className="stats">
        <div className="stat c-purple">
          <div className="stat-val">{syllabusLoading ? "—" : totalModules}</div>
          <div className="stat-lbl">Modules in your program</div>
        </div>
        <div className="stat c-orange">
          <div className="stat-val">{progressLoading ? "—" : countModulesCovered(userDone)}</div>
          <div className="stat-lbl">Modules covered</div>
        </div>
        <div className="stat c-green">
          <div className="stat-val">{certificationsEarned}</div>
          <div className="stat-lbl">Certifications earned</div>
        </div>
        <div className="stat c-cyan">
          <div className="stat-val">{personalBestScore}</div>
          <div className="stat-lbl">Personal best score</div>
        </div>
      </div>

      <div className="ph compact">
        <h2>Learning Progress</h2>
      </div>

      {progressByProduct.map(({ product, certRows, visibleCerts }) => {
        const overallTotal = product.moduleCount * visibleCerts.length;
        const overallDone = certRows.reduce((acc, row) => acc + row.certDone, 0);
        const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;
        return (
          <section className="prog-section" key={product.id}>
            <div className="prog-section-head">
              <div>
                <div className="prog-section-title">{`${product.icon} ${product.name}`}</div>
                <div className="prog-section-sub">{`${isLoading ? "—" : overallDone} of ${overallTotal} module-levels completed`}</div>
              </div>
              <div className="prog-ring-num">{isLoading ? "—" : `${overallPct}%`}</div>
            </div>
            <div className="prog-bars">
              {certRows.map((row) => (
                <div className="prog-bar-row" key={`${product.id}-${row.certId}`}>
                  <span className="prog-bar-label">{`${CMETA[row.certId].icon} ${CMETA[row.certId].name}`}</span>
                  <div className="prog-bar-track">
                    <div
                      className="prog-bar-fill"
                      style={{
                        width: isLoading ? "0%" : `${Math.round((row.certDone / row.certTotal) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="prog-bar-pct">
                    {isLoading ? "—/—" : `${row.certDone}/${row.certTotal}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <div className="ph compact">
        <h2>Certification Journey</h2>
      </div>
      <div id="dashJourney">
        {PRODUCTS.map((product) => {
          const certs = getVisibleCerts(user.team, product.certs);
          return (
            <div className="journey-wrap" key={`j-${product.id}`}>
              <div className="journey-prod-title">{`${product.icon} ${product.name} — ${product.sub}`}</div>
              <div className="journey">
                {certs.map((certId, index) => {
                  const level = findCertLevel(certifications, product.name, CMETA[certId].name);
                  const passed = level?.status === "completed";
                  const previousCert = certs[index - 1];
                  const prevLevel =
                    index > 0
                      ? findCertLevel(certifications, product.name, CMETA[previousCert].name)
                      : null;
                  const prevOk = index === 0 || prevLevel?.status === "completed";
                  const status = passed
                    ? "earned"
                    : !prevOk || level?.status === "locked"
                      ? "locked"
                      : "available";
                  return (
                    <div className={`jstep ${status}`} key={`${product.id}-${certId}`}>
                      <div className={`jbadge ${status}`}>
                        {status === "earned"
                          ? "✓ Certified"
                          : status === "available"
                            ? "Ready"
                            : "🔒 Locked"}
                      </div>
                      <div className="jstep-ico">{CMETA[certId].icon}</div>
                      <div className="jstep-name">{CMETA[certId].name}</div>
                      <div className="jstep-desc">{CMETA[certId].desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="dashboard-footnote">{`Total completed module-levels: ${progressLoading ? "—" : totalProgressEntries}`}</div>
    </div>
  );
}
