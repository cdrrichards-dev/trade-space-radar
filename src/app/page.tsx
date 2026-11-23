"use client";

import React, { useEffect, useState, useMemo } from "react";
import PolarRadarEngine from "@/components/radar/PolarRadarEngine";
import { getRadarCoreClient } from "@/lib/supabase/client";
import { DomainPack, RadarAxis, CouplingRule } from "@/types/domain-pack";

type SpecialtyDomain = "oncology_sclc" | "nephrology_transplant";

interface FacilityRow {
  id: string;
  cms_provider_id: string;
  name: string;
  city: string;
  state: string;
  zip_code: string;
  specialty_domain: SpecialtyDomain;
  nci_or_coe_badge: string | null;
  normalized_scores: Record<string, number>;
}

const DOMAIN_CONFIGS: Record<
  SpecialtyDomain,
  {
    domainName: string;
    tagline: string;
    axes: RadarAxis[];
    targetThreshold: Record<string, number>;
    couplingRules: CouplingRule[];
  }
> = {
  oncology_sclc: {
    domainName: "CareRadar · Thoracic & Neuroendocrine Oncology",
    tagline: "250-Mile Trade-Space Analysis · Parkersburg, WV (26101)",
    axes: [
      {
        id: "outcomes",
        label: "Risk-Adjusted Survival & Outcomes",
        shortLabel: "Outcomes",
        description: "30-day & 1-year survival adjusted for SCLC stage and comorbidity",
        weight: 1.5,
      },
      {
        id: "volume",
        label: "Subtype Case Volume",
        shortLabel: "Subtype Vol",
        description: "Annual thoracic neuroendocrine & SCLC patient volume",
        weight: 1.4,
      },
      {
        id: "trials",
        label: "Clinical Trials & DLL3 / ADC Access",
        shortLabel: "Trials & ADCs",
        description: "Active Phase I/II/III SCLC trials and bispecific/ADC therapies",
        weight: 1.6,
      },
      {
        id: "safety",
        label: "Patient Safety & ICU Support",
        shortLabel: "Safety & ICU",
        description: "Infection control, oncology ICU ratio, and complication management",
        weight: 1.1,
      },
      {
        id: "logistics",
        label: "Travel & Caregiver Logistics",
        shortLabel: "Logistics",
        description: "Drive time from Parkersburg, lodging access, and caregiver burden",
        weight: 1.0,
      },
      {
        id: "insurance",
        label: "Insurance & Financial Coverage",
        shortLabel: "Insurance",
        description: "In-network payer coverage and patient assistance programs",
        weight: 1.0,
      },
    ],
    targetThreshold: {
      outcomes: 8.5,
      volume: 8.0,
      trials: 8.5,
      safety: 8.0,
      logistics: 6.5,
      insurance: 7.5,
    },
    couplingRules: [
      {
        id: "trial-deficit",
        axisIds: ["trials", "volume"],
        threshold: 6.0,
        operator: "lte",
        severity: "critical",
        title: "High-Acuity Subtype & Trial Gap",
        recommendation:
          "For Extensive-Stage or relapsed SCLC, pairing a regional NCI center (OSU James or WVU Morgantown) for trial access with Camden Clark locally for mid-cycle labs captures both clinical depth and travel relief.",
      },
    ],
  },
  nephrology_transplant: {
    domainName: "CareRadar · Nephrology & Kidney Transplant",
    tagline: "Regional & Quaternary Referral Comparison · Richmond, VA (23112)",
    axes: [
      {
        id: "outcomes",
        label: "1-Year & 3-Year Graft Survival",
        shortLabel: "Graft Survival",
        description: "SRTR risk-adjusted patient and graft survival outcomes",
        weight: 1.6,
      },
      {
        id: "volume",
        label: "Annual Transplant & Complex CKD Volume",
        shortLabel: "Case Vol",
        description: "Annual living/deceased donor kidney transplant volume",
        weight: 1.4,
      },
      {
        id: "trials",
        label: "Desensitization & Immunosuppression Protocols",
        shortLabel: "Protocols",
        description: "Access to paired-exchange, desensitization, and steroid-sparing trials",
        weight: 1.3,
      },
      {
        id: "safety",
        label: "Post-Op Infection & Readmission Safety",
        shortLabel: "Safety",
        description: "30-day surgical complication and infection control benchmarks",
        weight: 1.2,
      },
      {
        id: "logistics",
        label: "Follow-Up & Lab Proximity",
        shortLabel: "Logistics",
        description: "Frequency of post-transplant labs and drive time from Midlothian/Richmond",
        weight: 1.1,
      },
      {
        id: "insurance",
        label: "Payer & Transplant Network Coverage",
        shortLabel: "Insurance",
        description: "In-network transplant center of excellence coverage",
        weight: 1.0,
      },
    ],
    targetThreshold: {
      outcomes: 8.8,
      volume: 8.2,
      trials: 7.5,
      safety: 8.5,
      logistics: 7.5,
      insurance: 8.0,
    },
    couplingRules: [
      {
        id: "transplant-hybrid",
        axisIds: ["logistics", "outcomes"],
        threshold: 7.0,
        operator: "lte",
        severity: "info",
        title: "Dual-Listing & Follow-Up Trade-Space",
        recommendation:
          "Patients can evaluate a local Richmond center (VCU Hume-Lee or Henrico Doctors') for rapid lab monitoring while dual-listing at a higher-volume quaternary center (UVA or Johns Hopkins) if high sensitization reduces local match rates.",
      },
    ],
  },
};

export default function HomePage() {
  const [selectedDomain, setSelectedDomain] =
    useState<SpecialtyDomain>("oncology_sclc");
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [primaryId, setPrimaryId] = useState<string>("");
  const [comparisonId, setComparisonId] = useState<string>("");
  const [liveScores, setLiveScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch all benchmark facilities from radar_core on mount
  useEffect(() => {
    async function loadFacilities() {
      setLoading(true);
      setErrorMsg(null);

      const supabase = getRadarCoreClient();
      const { data, error } = await supabase
        .from("facilities")
        .select(
          "id, cms_provider_id, name, city, state, zip_code, specialty_domain, nci_or_coe_badge, normalized_scores"
        )
        .order("name", { ascending: true });

      if (error) {
        setErrorMsg(
          `Supabase query failed: ${error.message}. Verify radar_core is exposed in Project Settings -> Data API.`
        );
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setFacilities(data as FacilityRow[]);
      }
      setLoading(false);
    }

    loadFacilities();
  }, []);

  // Filter facilities matching the active specialty domain
  const domainFacilities = useMemo(
    () => facilities.filter((f) => f.specialty_domain === selectedDomain),
    [facilities, selectedDomain]
  );

  // When domain changes (or initial data arrives), select first two facilities automatically
  useEffect(() => {
    if (domainFacilities.length === 0) return;

    const first = domainFacilities[0];
    const second = domainFacilities[1] ?? domainFacilities[0];

    setPrimaryId(first.id);
    setComparisonId(second.id);
    setLiveScores({ ...first.normalized_scores });
  }, [domainFacilities]);

  // Handle user picking a new Primary facility from the dropdown
  const handlePrimarySelect = (newId: string) => {
    setPrimaryId(newId);
    const found = domainFacilities.find((f) => f.id === newId);
    if (found) {
      setLiveScores({ ...found.normalized_scores });
    }
  };

  const primaryFacility = domainFacilities.find((f) => f.id === primaryId);
  const comparisonFacility = domainFacilities.find((f) => f.id === comparisonId);
  const activeConfig = DOMAIN_CONFIGS[selectedDomain];

  // Assemble the DomainPack dynamically from live Supabase rows
  const activePack: DomainPack | null = primaryFacility
    ? {
        domainId: selectedDomain,
        domainName: activeConfig.domainName,
        tagline: activeConfig.tagline,
        mode: "overlay",
        scaleMin: 1,
        scaleMax: 10,
        axes: activeConfig.axes,
        primaryEntity: {
          id: primaryFacility.id,
          name: primaryFacility.name,
          subtitle: `${primaryFacility.city}, ${primaryFacility.state} (${primaryFacility.zip_code})`,
          badge: primaryFacility.nci_or_coe_badge ?? undefined,
          color: "#06b6d4",
          scores: primaryFacility.normalized_scores,
        },
        comparisonEntity:
          comparisonFacility && comparisonFacility.id !== primaryFacility.id
            ? {
                id: comparisonFacility.id,
                name: comparisonFacility.name,
                subtitle: `${comparisonFacility.city}, ${comparisonFacility.state} (${comparisonFacility.zip_code})`,
                badge: comparisonFacility.nci_or_coe_badge ?? undefined,
                color: "#f59e0b",
                scores: comparisonFacility.normalized_scores,
              }
            : undefined,
        targetThreshold: activeConfig.targetThreshold,
        couplingRules: activeConfig.couplingRules,
      }
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header + Domain Toggle */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Trade-Space Decision Engine · Live Supabase Core
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                radar_core.facilities
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
              {activeConfig.domainName}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {activeConfig.tagline}
            </p>
          </div>

          {/* Specialty Domain Switcher Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedDomain("oncology_sclc")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                selectedDomain === "oncology_sclc"
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              Thoracic Oncology (6)
            </button>
            <button
              onClick={() => setSelectedDomain("nephrology_transplant")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition ${
                selectedDomain === "nephrology_transplant"
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              Nephrology & Transplant (4)
            </button>
          </div>
        </header>

        {/* Facility Comparison Selector Bar */}
        {!loading && !errorMsg && domainFacilities.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-cyan-300 mb-1.5">
                Primary Facility (Cyan Polygon · Interactive)
              </label>
              <select
                value={primaryId}
                onChange={(e) => handlePrimarySelect(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                {domainFacilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.city}, {f.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                Overlay Comparison Facility (Amber Polygon)
              </label>
              <select
                value={comparisonId}
                onChange={(e) => setComparisonId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="">None (Single Facility View)</option>
                {domainFacilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.city}, {f.state}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={() =>
                  primaryFacility &&
                  setLiveScores({ ...primaryFacility.normalized_scores })
                }
                className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Reset Scores
              </button>
            </div>
          </section>
        )}

        {/* Loading, Error, or Live PolarRadarEngine */}
        {loading && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-400">
            Loading live facility benchmarks from Supabase <code>radar_core</code>...
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-950/50 border border-rose-800 rounded-2xl p-5 text-sm text-rose-200">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && activePack && (
          <PolarRadarEngine
            pack={activePack}
            primaryScores={liveScores}
            onScoreChange={(axisId, newValue) =>
              setLiveScores((prev) => ({ ...prev, [axisId]: newValue }))
            }
          />
        )}
      </div>
    </main>
  );
}
  );
}
