import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getVoiceCall,
  getVoiceCalls,
  type VoiceCall,
  type VoiceCallDetail,
  type VoiceMessage,
} from "../api/api";

import "./StatisticsPage.css";

type PeriodDays = 7 | 30 | 90;

type TopicKey =
  | "Horaires"
  | "Tarifs"
  | "Rendez-vous"
  | "Disponibilité"
  | "Garantie / retour"
  | "Livraison / commande"
  | "Réparation"
  | "Autres";

interface TopicCount {
  label: TopicKey;
  count: number;
}

interface KnowledgeGap {
  question: string;
  callId: string;
}

const PERIOD_OPTIONS: PeriodDays[] = [7, 30, 90];
const DAY_LABELS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
const HEATMAP_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const HOUR_BUCKETS = [0, 3, 6, 9, 12, 15, 18, 21];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function subtractDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function formatDuration(seconds: number) {
  if (seconds <= 0) {
    return "0 min";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (hours > 0) {
    return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${remainingSeconds.toString().padStart(2, "0")} s`;
  }

  return `${remainingSeconds} s`;
}

function formatShortDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes > 0) {
    return `${minutes} min ${remainingSeconds.toString().padStart(2, "0")} s`;
  }

  return `${remainingSeconds} s`;
}

function formatChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? "Nouvelle activité" : "Aucun changement";
  }

  const percent = Math.round(((current - previous) / previous) * 100);

  if (percent === 0) {
    return "Stable vs période précédente";
  }

  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent} % vs période précédente`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectTopic(text: string): TopicKey {
  const normalized = normalizeText(text);

  const groups: Array<[TopicKey, string[]]> = [
    ["Horaires", ["horaire", "heure", "ouvert", "ouvre", "ferme", "open", "close"]],
    ["Tarifs", ["prix", "tarif", "coute", "combien", "price", "cost"]],
    ["Rendez-vous", ["rendez-vous", "rdv", "appointment", "reservation", "reserver"]],
    ["Disponibilité", ["disponible", "disponibilite", "stock", "available", "availability"]],
    ["Garantie / retour", ["garantie", "warranty", "retour", "rembourse", "refund", "return"]],
    ["Livraison / commande", ["livraison", "commande", "delivery", "order", "expedition", "shipping"]],
    ["Réparation", ["reparation", "reparer", "repair", "ecran", "batterie", "battery"]],
  ];

  for (const [label, keywords] of groups) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return label;
    }
  }

  return "Autres";
}

function isKnowledgeGapAnswer(text: string) {
  const normalized = normalizeText(text);
  const markers = [
    "je ne sais pas",
    "je n'ai pas",
    "je nai pas",
    "pas d'information",
    "pas dinformation",
    "ne dispose pas",
    "je ne peux pas",
    "pas bien saisi",
    "pourriez-vous preciser",
    "pourriez vous preciser",
    "reformuler",
    "i don't know",
    "i dont know",
    "i don't have",
    "i dont have",
    "could you clarify",
  ];

  return markers.some((marker) => normalized.includes(marker));
}

function firstCustomerMessage(messages: VoiceMessage[]) {
  return messages.find((message) => message.role === "CUSTOMER")?.text ?? null;
}

function extractKnowledgeGaps(details: VoiceCallDetail[]) {
  const gaps: KnowledgeGap[] = [];

  for (const call of details) {
    for (let index = 0; index < call.messages.length; index += 1) {
      const message = call.messages[index];

      if (message.role !== "AGENT" || !isKnowledgeGapAnswer(message.text)) {
        continue;
      }

      for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
        const previous = call.messages[previousIndex];

        if (previous.role === "CUSTOMER" && previous.text.trim()) {
          gaps.push({
            callId: call.id,
            question: previous.text.trim(),
          });
          break;
        }
      }
    }
  }

  const unique = new Map<string, KnowledgeGap>();

  for (const gap of gaps) {
    const key = normalizeText(gap.question);
    if (!unique.has(key)) {
      unique.set(key, gap);
    }
  }

  return [...unique.values()];
}

function MetricIcon({
  name,
}: {
  name: "calls" | "duration" | "average" | "active";
}) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
  } as const;

  if (name === "calls") {
    return (
      <svg {...common}>
        <path d="M7.4 3.5 10 8l-2.2 2.2a15.2 15.2 0 0 0 6 6L16 14l4.5 2.6-.9 3.1a2 2 0 0 1-2 1.4C9.5 20.5 3.5 14.5 2.9 6.4a2 2 0 0 1 1.4-2l3.1-.9Z" />
      </svg>
    );
  }

  if (name === "duration") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "average") {
    return (
      <svg {...common}>
        <path d="M12 3v3" />
        <circle cx="12" cy="13" r="7" />
        <path d="M12 10v3l2 1" />
        <path d="M9 3h6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 18V9" />
      <path d="M10 18V5" />
      <path d="M16 18v-7" />
      <path d="M22 18V3" />
      <path d="m3 6 5-3 6 4 7-5" />
    </svg>
  );
}

function WaveDecoration() {
  const bars = [10, 18, 28, 38, 22, 13, 20, 31, 44, 34, 19, 12, 22, 34, 26, 14];

  return (
    <div aria-hidden="true" className="statistics-wave-decoration">
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}

export default function StatisticsPage() {
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [details, setDetails] = useState<VoiceCallDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadCalls() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getVoiceCalls();
        if (!isCancelled) {
          setCalls(data);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les statistiques.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCalls();

    return () => {
      isCancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), [calls, periodDays]);
  const currentStart = useMemo(
    () => subtractDays(startOfDay(now), periodDays - 1),
    [now, periodDays],
  );
  const previousStart = useMemo(
    () => subtractDays(currentStart, periodDays),
    [currentStart, periodDays],
  );

  const currentCalls = useMemo(
    () => calls.filter((call) => new Date(call.startedAt) >= currentStart),
    [calls, currentStart],
  );

  const previousCalls = useMemo(
    () =>
      calls.filter((call) => {
        const startedAt = new Date(call.startedAt);
        return startedAt >= previousStart && startedAt < currentStart;
      }),
    [calls, currentStart, previousStart],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadDetails() {
      if (currentCalls.length === 0) {
        setDetails([]);
        setIsLoadingDetails(false);
        return;
      }

      setIsLoadingDetails(true);

      try {
        const callsToAnalyze = [...currentCalls]
          .sort(
            (a, b) =>
              new Date(b.startedAt).getTime() -
              new Date(a.startedAt).getTime(),
          )
          .slice(0, 25);

        const settled = await Promise.allSettled(
          callsToAnalyze.map((call) => getVoiceCall(call.id)),
        );

        if (isCancelled) {
          return;
        }

        setDetails(
          settled.flatMap((result) =>
            result.status === "fulfilled" ? [result.value] : [],
          ),
        );
      } finally {
        if (!isCancelled) {
          setIsLoadingDetails(false);
        }
      }
    }

    void loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [currentCalls]);

  const currentTotalSeconds = useMemo(
    () => currentCalls.reduce((sum, call) => sum + (call.durationSeconds ?? 0), 0),
    [currentCalls],
  );
  const previousTotalSeconds = useMemo(
    () => previousCalls.reduce((sum, call) => sum + (call.durationSeconds ?? 0), 0),
    [previousCalls],
  );

  const currentAverageSeconds = currentCalls.length
    ? currentTotalSeconds / currentCalls.length
    : 0;
  const previousAverageSeconds = previousCalls.length
    ? previousTotalSeconds / previousCalls.length
    : 0;

  const activePeriod = useMemo(() => {
    if (currentCalls.length === 0) {
      return "Aucune donnée";
    }

    const buckets = new Map<string, number>();

    for (const call of currentCalls) {
      const date = new Date(call.startedAt);
      const startHour = Math.floor(date.getHours() / 3) * 3;
      const key = `${date.getDay()}-${startHour}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    const [bestKey] = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0];
    const [dayIndex, startHour] = bestKey.split("-").map(Number);
    const endHour = (startHour + 3) % 24;

    return `${DAY_LABELS[dayIndex]} ${startHour} h – ${endHour === 0 ? 24 : endHour} h`;
  }, [currentCalls]);

  const dailySeries = useMemo(() => {
    const points: Array<{ label: string; count: number }> = [];

    for (let offset = 0; offset < periodDays; offset += 1) {
      const date = new Date(currentStart);
      date.setDate(currentStart.getDate() + offset);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const count = currentCalls.filter((call) => {
        const startedAt = new Date(call.startedAt);
        return startedAt >= date && startedAt < nextDate;
      }).length;

      points.push({
        count,
        label: date.toLocaleDateString("fr-CA", {
          day: "numeric",
          month: "short",
        }),
      });
    }

    return points;
  }, [currentCalls, currentStart, periodDays]);

  const chartPoints = useMemo(() => {
    if (dailySeries.length === 0) {
      return "";
    }

    const max = Math.max(...dailySeries.map((point) => point.count), 1);
    const width = 640;
    const height = 190;
    const horizontalPadding = 12;
    const verticalPadding = 18;
    const usableWidth = width - horizontalPadding * 2;
    const usableHeight = height - verticalPadding * 2;

    return dailySeries
      .map((point, index) => {
        const x =
          dailySeries.length === 1
            ? width / 2
            : horizontalPadding +
              (index / (dailySeries.length - 1)) * usableWidth;
        const y =
          height -
          verticalPadding -
          (point.count / max) * usableHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }, [dailySeries]);

  const chartAreaPoints = chartPoints
    ? `12,172 ${chartPoints} 628,172`
    : "";

  const visibleLabels = useMemo(() => {
    if (dailySeries.length <= 10) {
      return dailySeries.map((_, index) => index);
    }

    const desiredLabels = periodDays === 30 ? 6 : 7;
    const step = Math.max(1, Math.floor((dailySeries.length - 1) / (desiredLabels - 1)));
    const indexes: number[] = [];

    for (let index = 0; index < dailySeries.length; index += step) {
      indexes.push(index);
    }

    if (indexes[indexes.length - 1] !== dailySeries.length - 1) {
      indexes.push(dailySeries.length - 1);
    }

    return indexes;
  }, [dailySeries, periodDays]);

  const heatmap = useMemo(() => {
    const values = new Map<string, number>();
    let max = 0;

    for (const call of currentCalls) {
      const date = new Date(call.startedAt);
      const hourBucket = Math.floor(date.getHours() / 3) * 3;
      const key = `${date.getDay()}-${hourBucket}`;
      const value = (values.get(key) ?? 0) + 1;
      values.set(key, value);
      max = Math.max(max, value);
    }

    return { max, values };
  }, [currentCalls]);

  const topics = useMemo<TopicCount[]>(() => {
    const counts = new Map<TopicKey, number>();

    for (const detail of details) {
      const firstMessage = firstCustomerMessage(detail.messages);
      if (!firstMessage) {
        continue;
      }

      const topic = detectTopic(firstMessage);
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [details]);

  const knowledgeGaps = useMemo(() => extractKnowledgeGaps(details), [details]);

  const resultCounts = useMemo(() => {
    const completed = currentCalls.filter((call) => call.status === "COMPLETED").length;
    const inProgress = currentCalls.filter((call) => call.status === "IN_PROGRESS").length;
    const failed = currentCalls.filter((call) => call.status === "FAILED").length;
    return { completed, failed, inProgress };
  }, [currentCalls]);

  const completedPercent = currentCalls.length
    ? Math.round((resultCounts.completed / currentCalls.length) * 100)
    : 0;
  const inProgressPercent = currentCalls.length
    ? Math.round((resultCounts.inProgress / currentCalls.length) * 100)
    : 0;
  const failedPercent = Math.max(0, 100 - completedPercent - inProgressPercent);

  const donutBackground = currentCalls.length
    ? `conic-gradient(#285cff 0 ${completedPercent}%, #f2a12c ${completedPercent}% ${completedPercent + inProgressPercent}%, #ef6b5b ${completedPercent + inProgressPercent}% 100%)`
    : "conic-gradient(#eeeeee 0 100%)";

  const topicMax = Math.max(...topics.map((topic) => topic.count), 1);

  const advice = useMemo(() => {
    const items: Array<{ icon: "clock" | "book" | "check"; text: string }> = [];

    if (currentCalls.length > 0) {
      items.push({
        icon: "clock",
        text: `Votre période la plus active est ${activePeriod.toLowerCase()}. Gardez les informations essentielles particulièrement à jour avant ce créneau.`,
      });
    }

    if (knowledgeGaps.length > 0) {
      items.push({
        icon: "book",
        text: `${knowledgeGaps.length} question${knowledgeGaps.length > 1 ? "s" : ""} récente${knowledgeGaps.length > 1 ? "s" : ""} semble${knowledgeGaps.length === 1 ? "" : "nt"} avoir demandé une précision ou une information manquante.`,
      });
    } else if (!isLoadingDetails && details.length > 0) {
      items.push({
        icon: "book",
        text: "Aucune réponse d'incertitude évidente n'a été détectée dans les appels analysés.",
      });
    }

    if (currentCalls.length > 0) {
      items.push({
        icon: "check",
        text:
          failedPercent > 5
            ? `${failedPercent} % des appels de la période sont en échec. Une vérification de ces appels peut aider à repérer un problème récurrent.`
            : `${completedPercent} % des appels de la période sont terminés avec le statut Traité.`,
      });
    }

    return items.slice(0, 3);
  }, [
    activePeriod,
    completedPercent,
    currentCalls.length,
    details.length,
    failedPercent,
    isLoadingDetails,
    knowledgeGaps.length,
  ]);

  if (isLoading) {
    return (
      <section className="statistics-page">
        <div className="statistics-loading-card">
          <span className="statistics-spinner" />
          <div>
            <strong>Préparation de vos statistiques</strong>
            <p>AllenVoice analyse les appels enregistrés.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="statistics-page">
      <header className="statistics-header">
        <div>
          <div className="statistics-eyebrow">Analyse</div>
          <h1>Statistique</h1>
          <p>Comprenez l'activité de votre agent et les besoins de vos clients.</p>
        </div>

        <WaveDecoration />

        <div className="statistics-period-selector" aria-label="Période d'analyse">
          {PERIOD_OPTIONS.map((days) => (
            <button
              className={days === periodDays ? "is-active" : ""}
              key={days}
              onClick={() => setPeriodDays(days)}
              type="button"
            >
              {days} jours
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="statistics-alert" role="alert">
          <strong>Impossible de charger les données.</strong>
          <span>{error}</span>
        </div>
      )}

      <div className="statistics-metrics-grid">
        <article className="statistics-metric-card">
          <div className="statistics-metric-icon"><MetricIcon name="calls" /></div>
          <div>
            <span>Appels pris en charge</span>
            <strong>{currentCalls.length}</strong>
            <small>{formatChange(currentCalls.length, previousCalls.length)}</small>
          </div>
        </article>

        <article className="statistics-metric-card">
          <div className="statistics-metric-icon"><MetricIcon name="duration" /></div>
          <div>
            <span>Durée totale des appels</span>
            <strong>{formatDuration(currentTotalSeconds)}</strong>
            <small>{formatChange(currentTotalSeconds, previousTotalSeconds)}</small>
          </div>
        </article>

        <article className="statistics-metric-card">
          <div className="statistics-metric-icon"><MetricIcon name="average" /></div>
          <div>
            <span>Durée moyenne</span>
            <strong>{formatShortDuration(currentAverageSeconds)}</strong>
            <small>{formatChange(currentAverageSeconds, previousAverageSeconds)}</small>
          </div>
        </article>

        <article className="statistics-metric-card">
          <div className="statistics-metric-icon"><MetricIcon name="active" /></div>
          <div>
            <span>Période la plus active</span>
            <strong className="statistics-active-period-value">{activePeriod}</strong>
            <small>Selon les appels de la période</small>
          </div>
        </article>
      </div>

      <div className="statistics-main-grid">
        <article className="statistics-card statistics-evolution-card">
          <div className="statistics-card-heading">
            <div>
              <h2>Évolution des appels</h2>
              <p>Nombre d'appels reçus au fil de la période.</p>
            </div>
            <span className="statistics-legend"><i /> Appels</span>
          </div>

          {currentCalls.length === 0 ? (
            <div className="statistics-empty-chart">Aucun appel sur cette période.</div>
          ) : (
            <div className="statistics-line-chart">
              <div className="statistics-y-guides" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <svg
                aria-label="Évolution du nombre d'appels"
                preserveAspectRatio="none"
                role="img"
                viewBox="0 0 640 190"
              >
                <defs>
                  <linearGradient id="statisticsAreaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#285cff" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#285cff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon fill="url(#statisticsAreaGradient)" points={chartAreaPoints} />
                <polyline
                  fill="none"
                  points={chartPoints}
                  stroke="#285cff"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="statistics-x-labels">
                {visibleLabels.map((index) => (
                  <span
                    key={index}
                    style={{ left: `${(index / Math.max(dailySeries.length - 1, 1)) * 100}%` }}
                  >
                    {dailySeries[index]?.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="statistics-card statistics-heatmap-card">
          <div className="statistics-card-heading">
            <div>
              <h2>Moments les plus actifs</h2>
              <p>Répartition des appels selon le jour et l'heure.</p>
            </div>
          </div>

          <div className="statistics-heatmap">
            <div className="statistics-heatmap-hours">
              {HOUR_BUCKETS.map((hour) => <span key={hour}>{hour} h</span>)}
            </div>
            {HEATMAP_DAY_ORDER.map((dayIndex) => (
              <div className="statistics-heatmap-row" key={dayIndex}>
                <span>{DAY_LABELS[dayIndex]}</span>
                <div className="statistics-heatmap-cells">
                  {HOUR_BUCKETS.map((hour) => {
                    const value = heatmap.values.get(`${dayIndex}-${hour}`) ?? 0;
                    const intensity = heatmap.max ? value / heatmap.max : 0;
                    return (
                      <i
                        aria-label={`${DAY_LABELS[dayIndex]} ${hour} h : ${value} appel${value > 1 ? "s" : ""}`}
                        key={hour}
                        style={{ opacity: value === 0 ? 0.08 : 0.22 + intensity * 0.78 }}
                        title={`${value} appel${value > 1 ? "s" : ""}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="statistics-active-insight">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 3v18M3 12h18" />
            </svg>
            <span>Créneau le plus actif : <strong>{activePeriod}</strong></span>
          </div>
        </article>
      </div>

      <div className="statistics-bottom-grid">
        <article className="statistics-card statistics-topics-card">
          <div className="statistics-card-heading statistics-card-heading--compact">
            <div>
              <h2>Motifs d'appels fréquents</h2>
              <p>Thèmes détectés dans les premiers messages clients.</p>
            </div>
          </div>

          {isLoadingDetails ? (
            <div className="statistics-inline-loading"><span className="statistics-spinner" /> Analyse des conversations…</div>
          ) : topics.length === 0 ? (
            <div className="statistics-card-empty">Pas assez de conversation pour détecter des thèmes.</div>
          ) : (
            <div className="statistics-topic-list">
              {topics.map((topic) => (
                <div className="statistics-topic-row" key={topic.label}>
                  <div><span>{topic.label}</span><strong>{topic.count}</strong></div>
                  <div className="statistics-topic-track">
                    <i style={{ width: `${Math.max(8, (topic.count / topicMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="statistics-card statistics-results-card">
          <div className="statistics-card-heading statistics-card-heading--compact">
            <div>
              <h2>Résultats des appels</h2>
              <p>État final enregistré par AllenVoice.</p>
            </div>
          </div>

          <div className="statistics-results-content">
            <div className="statistics-donut" style={{ background: donutBackground }}>
              <div>
                <strong>{currentCalls.length}</strong>
                <span>appels</span>
              </div>
            </div>
            <div className="statistics-result-legend">
              <div><i className="is-completed" /><span>Traités</span><strong>{resultCounts.completed}</strong></div>
              <div><i className="is-progress" /><span>En cours</span><strong>{resultCounts.inProgress}</strong></div>
              <div><i className="is-failed" /><span>Échecs</span><strong>{resultCounts.failed}</strong></div>
            </div>
          </div>
        </article>

        <article className="statistics-card statistics-gaps-card">
          <div className="statistics-card-heading statistics-card-heading--compact">
            <div>
              <h2>Connaissances à améliorer</h2>
              <p>Questions ayant déclenché une réponse incertaine.</p>
            </div>
          </div>

          {isLoadingDetails ? (
            <div className="statistics-inline-loading"><span className="statistics-spinner" /> Recherche des lacunes…</div>
          ) : knowledgeGaps.length === 0 ? (
            <div className="statistics-good-state">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
              <span>Aucune lacune évidente détectée dans l'échantillon analysé.</span>
            </div>
          ) : (
            <div className="statistics-gap-list">
              {knowledgeGaps.slice(0, 3).map((gap, index) => (
                <div key={`${gap.callId}-${index}`}>
                  <span>{index + 1}</span>
                  <p>{gap.question}</p>
                </div>
              ))}
            </div>
          )}

          {currentCalls.length > 25 && (
            <small className="statistics-sample-note">Analyse qualitative basée sur les 25 appels les plus récents de la période.</small>
          )}
        </article>

        <article className="statistics-card statistics-advice-card">
          <div className="statistics-advice-wave" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} style={{ height: `${8 + ((index * 13) % 35)}px` }} />
            ))}
          </div>
          <div className="statistics-card-heading statistics-card-heading--compact">
            <div>
              <h2>Conseils AllenVoice</h2>
              <p>Suggestions basées sur les données affichées.</p>
            </div>
          </div>

          {advice.length === 0 ? (
            <div className="statistics-advice-empty">Les conseils apparaîtront après les premiers appels.</div>
          ) : (
            <div className="statistics-advice-list">
              {advice.map((item, index) => (
                <div key={`${item.icon}-${index}`}>
                  <span className="statistics-advice-number">0{index + 1}</span>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
