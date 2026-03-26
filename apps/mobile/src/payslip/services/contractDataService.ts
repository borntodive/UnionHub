import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchClaContract, ClaContract } from "./claContractsApi";
import {
  getContractData as getStaticContractData,
  applyCorrections,
  getActiveCorrections,
} from "../data/contractData";

const CACHE_KEY_PREFIX = "cla_contract_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedContract {
  data: ClaContract;
  timestamp: number;
}

/**
 * Get contract data with backend priority, fallback to static
 * Caches backend data locally for offline use
 */
export async function getContractData(
  company: string,
  role: string,
  rank: string,
  date: string,
): Promise<any | null> {
  const targetDate = new Date(date);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1; // 1-12
  const cacheKey = `${CACHE_KEY_PREFIX}${company}_${role}_${rank}_${targetYear}_${targetMonth}`;

  try {
    // 1. Try to fetch from backend with specific year/month
    const backendData = await fetchClaContract(
      company,
      role,
      rank,
      targetYear,
      targetMonth,
    );

    if (backendData && backendData.isActive) {
      // Cache the result
      const cacheData: CachedContract = {
        data: backendData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Convert to format expected by calculator
      return convertToCalculatorFormat(backendData);
    }
  } catch (error) {
    console.log("Backend contract fetch failed, trying cache:", error);
  }

  // 2. Try to use cached data
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed: CachedContract = JSON.parse(cached);
      const isValid = Date.now() - parsed.timestamp < CACHE_TTL_MS;

      if (isValid) {
        return convertToCalculatorFormat(parsed.data);
      }
    }
  } catch (error) {
    console.log("Cache read failed:", error);
  }

  // 3. Fallback to static data
  console.log("Using static contract data for", company, role, rank);
  const staticData = getStaticContractData(company, role, rank);
  if (!staticData) return null;

  // Apply corrections based on date
  const corrections = getActiveCorrections(company, role, date);
  return applyCorrections(staticData, corrections, rank);
}

/**
 * Clear contract cache (call when admin updates contracts)
 */
export async function clearContractCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const contractKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    await AsyncStorage.multiRemove(contractKeys);
  } catch (error) {
    console.error("Failed to clear contract cache:", error);
  }
}

/**
 * Convert backend ClaContract to calculator format
 */
function convertToCalculatorFormat(contract: ClaContract): any {
  return {
    basic: contract.basic,
    ffp: contract.ffp,
    sbh: contract.sbh,
    al: contract.al,
    oob: contract.oob,
    woff: contract.woff,
    allowance: contract.allowance,
    diaria: contract.diaria,
    rsa: contract.rsa,
    itud: contract.itud,
    training: contract.trainingConfig,
    seniorityBrackets: contract.seniorityBrackets ?? undefined,
    // Add metadata for debugging
    _source: "backend",
    _version: contract.version,
    _updatedAt: contract.updatedAt,
  };
}

/**
 * Check if backend contract exists for given parameters
 */
export async function hasBackendContract(
  company: string,
  role: string,
  rank: string,
  date?: Date,
): Promise<boolean> {
  try {
    const targetDate = date || new Date();
    const contract = await fetchClaContract(
      company,
      role,
      rank,
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
    );
    return contract !== null && contract.isActive;
  } catch {
    return false;
  }
}
