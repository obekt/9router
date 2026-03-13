import { NextResponse } from "next/server";
import { getAllApiKeysWithQuota, setApiKeyQuota } from "@/lib/apiKeyQuota";

export const dynamic = "force-dynamic";

// GET /api/keys - List API keys with quota info
export async function GET() {
  try {
    const keys = await getAllApiKeysWithQuota();
    return NextResponse.json({ keys });
  } catch (error) {
    console.error("[/api/keys] Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key (existing functionality - pass through to original handler)
export async function POST(request) {
  // Import the original handler
  const { getApiKeys, createApiKey } = await import("@/lib/localDb");
  const { getConsistentMachineId } = await import("@/shared/utils/machineId");
  
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const machineId = await getConsistentMachineId();
    const apiKey = await createApiKey(name, machineId);

    return NextResponse.json({
      key: apiKey.key,
      name: apiKey.name,
      id: apiKey.id,
      machineId: apiKey.machineId,
    }, { status: 201 });
  } catch (error) {
    console.error("[/api/keys] Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
