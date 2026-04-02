import { useState, useEffect } from "react";
import { getContractData } from "../services/contractDataService";

/**
 * Async hook that fetches contract data from DB/cache.
 * Use in screens that display contract values (ContractScreen, ReverseScreen, SettingsScreen).
 */
export function useContractData(
  company: string,
  role: string,
  rank: string,
  date: string,
): { contractData: any | null; loading: boolean } {
  const [contractData, setContractData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractData(company, role, rank, date)
      .then((data) => {
        if (!cancelled) {
          setContractData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company, role, rank, date]);

  return { contractData, loading };
}
