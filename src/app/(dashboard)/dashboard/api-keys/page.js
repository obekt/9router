import { getMachineId } from "@/shared/utils/machine";
import ApiKeysPageClient from "./ApiKeysPageClient";

export default async function ApiKeysPage() {
  const machineId = await getMachineId();
  return <ApiKeysPageClient machineId={machineId} />;
}
