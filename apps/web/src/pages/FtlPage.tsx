import { useState, useMemo } from "react";
import { useFtlStore } from "../ftl/useFtlStore";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import {
  calcMaxFdp,
  calcMinRest,
  calcExtension,
  timeToMinutes,
  minutesToDuration,
} from "@unionhub/shared/ftl";
import type { StandbyType } from "@unionhub/shared/ftl";

type Tab = "fdp" | "extension" | "rest";

function ResultBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
    >
      {label}
    </span>
  );
}

export function FtlPage() {
  const store = useFtlStore();
  const [tab, setTab] = useState<Tab>("fdp");

  // FDP result — computed in real-time
  const fdpResult = useMemo(() => {
    if (!store.reportTime) return null;
    try {
      const reportMin = timeToMinutes(store.reportTime);
      return calcMaxFdp(
        reportMin,
        store.sectors,
        store.standby.type !== "none" ? store.standby : undefined,
      );
    } catch {
      return null;
    }
  }, [store.reportTime, store.sectors, store.standby]);

  // Extension result
  const extResult = useMemo(() => {
    if (!store.reportTime || !store.currentFdp) return null;
    try {
      const reportMin = timeToMinutes(store.reportTime);
      const encroachment = fdpResult?.woclEncroachmentMin ?? 0;
      return calcExtension(
        reportMin,
        store.sectors,
        store.extType,
        encroachment,
        store.standby.type !== "none" ? store.standby : undefined,
      );
    } catch {
      return null;
    }
  }, [
    store.reportTime,
    store.sectors,
    store.extType,
    store.currentFdp,
    fdpResult,
    store.standby,
  ]);

  // Rest result
  const restResult = useMemo(() => {
    if (!store.dutyStart || !store.finishTime) return null;
    try {
      const start = timeToMinutes(store.dutyStart);
      let finish = timeToMinutes(store.finishTime);
      if (finish <= start) finish += 24 * 60;
      const dutyDuration = finish - start;
      return calcMinRest(dutyDuration, store.isHomeBase);
    } catch {
      return null;
    }
  }, [store.dutyStart, store.finishTime, store.isHomeBase]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "fdp", label: "FDP Massimo" },
    { id: "extension", label: "Estensione" },
    { id: "rest", label: "Riposo Minimo" },
  ];

  return (
    <div className="flex h-full min-h-0">
      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">FTL Calculator</h1>
          <Button variant="ghost" size="sm" onClick={() => store.reset()}>
            Reset
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t.id
                  ? "bg-white border border-b-white border-gray-200 text-[#177246] -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "fdp" && (
          <div className="space-y-5">
            <Card padding="md">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Report &amp; Settori
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Report time (HH:MM)"
                  placeholder="06:00"
                  value={store.reportTime}
                  onChange={(e) => store.set({ reportTime: e.target.value })}
                />
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">
                    Settori
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <button
                        key={s}
                        onClick={() => store.set({ sectors: s })}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                          store.sectors === s
                            ? "bg-[#177246] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label="Wake time (HH:MM)"
                  placeholder="04:30"
                  value={store.wakeTime}
                  onChange={(e) => store.set({ wakeTime: e.target.value })}
                />
              </div>
            </Card>

            <Card padding="md">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Standby
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Tipo standby
                  </label>
                  <select
                    value={store.standby.type}
                    onChange={(e) =>
                      store.set({
                        standby: {
                          ...store.standby,
                          type: e.target.value as StandbyType,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]"
                  >
                    <option value="none">Nessuno</option>
                    <option value="airport">Airport standby</option>
                    <option value="home">Home standby</option>
                    <option value="reserve">Reserve</option>
                  </select>
                </div>
                {store.standby.type !== "none" && (
                  <>
                    <Input
                      label="Inizio standby (HH:MM)"
                      placeholder="00:00"
                      value={store.standby.startTime}
                      onChange={(e) =>
                        store.set({
                          standby: {
                            ...store.standby,
                            startTime: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      label="Call time (HH:MM)"
                      placeholder="00:00"
                      value={store.standby.callTime}
                      onChange={(e) =>
                        store.set({
                          standby: {
                            ...store.standby,
                            callTime: e.target.value,
                          },
                        })
                      }
                    />
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === "extension" && (
          <Card padding="md">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
              Parametri Estensione
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="FDP corrente (HH:MM)"
                placeholder="12:00"
                value={store.currentFdp}
                onChange={(e) => store.set({ currentFdp: e.target.value })}
              />
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Tipo estensione
                </label>
                <select
                  value={store.extType}
                  onChange={(e) =>
                    store.set({
                      extType: e.target.value as "planned" | "discretionary",
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#177246]"
                >
                  <option value="planned">Pianificata</option>
                  <option value="discretionary">Discrezionale</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Il report time e i settori vengono presi dal tab FDP.
            </p>
          </Card>
        )}

        {tab === "rest" && (
          <Card padding="md">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
              Dati Servizio
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Inizio duty (HH:MM)"
                placeholder="06:00"
                value={store.dutyStart}
                onChange={(e) => store.set({ dutyStart: e.target.value })}
              />
              <Input
                label="Fine duty (HH:MM)"
                placeholder="18:30"
                value={store.finishTime}
                onChange={(e) => store.set({ finishTime: e.target.value })}
              />
              <div className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  id="homeBase"
                  checked={store.isHomeBase}
                  onChange={(e) => store.set({ isHomeBase: e.target.checked })}
                  className="rounded border-gray-300 text-[#177246] focus:ring-[#177246]"
                />
                <label htmlFor="homeBase" className="text-sm text-gray-700">
                  Home base (riposo aumentato)
                </label>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Results */}
      <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Risultati
        </h2>

        {/* FDP result */}
        {fdpResult && (
          <Card padding="sm" shadow="none" className="border-[#177246]/30">
            <div className="text-xs font-semibold text-[#177246] uppercase tracking-wide mb-3">
              FDP Massimo
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              {minutesToDuration(fdpResult.maxFdp)}
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Tabella: {minutesToDuration(fdpResult.tableMax)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fdpResult.isEarlyStart && (
                <ResultBadge ok={false} label="Early start" />
              )}
              {fdpResult.isNightDuty && (
                <ResultBadge ok={false} label="Night duty" />
              )}
              {fdpResult.limitedByAwake && (
                <ResultBadge ok={false} label="18h awake" />
              )}
              {fdpResult.woclEncroachmentMin > 0 && (
                <ResultBadge
                  ok={false}
                  label={`WOCL +${fdpResult.woclEncroachmentMin}min`}
                />
              )}
              {fdpResult.standbyReduction > 0 && (
                <ResultBadge
                  ok={true}
                  label={`SBY −${fdpResult.standbyReduction}min`}
                />
              )}
            </div>
          </Card>
        )}

        {/* Extension result */}
        {extResult && (
          <Card padding="sm" shadow="none" className="border-blue-200">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Estensione
            </div>
            {extResult.allowed ? (
              <>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {minutesToDuration(extResult.extendedFdp)}
                </div>
                <ResultBadge ok={true} label="Consentita" />
              </>
            ) : (
              <>
                <ResultBadge ok={false} label="Non consentita" />
                {extResult.reason && (
                  <p className="text-xs text-gray-500 mt-2">
                    {extResult.reason}
                  </p>
                )}
              </>
            )}
          </Card>
        )}

        {/* Rest result */}
        {restResult && (
          <Card padding="sm" shadow="none" className="border-purple-200">
            <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">
              Riposo Minimo
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {minutesToDuration(restResult.minRest)}
            </div>
          </Card>
        )}

        {!fdpResult && !restResult && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <div className="text-4xl mb-3">✈️</div>
            <p className="text-sm text-center">
              Inserisci il report time per vedere i limiti FTL
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
