import { NextResponse } from "next/server";
import { setApiKeyQuota, getApiKeyQuota } from "@/lib/apiKeyQuota";

export const dynamic = "force-dynamic";

// GET /api/keys/[id]/quota - Get quota for specific API key
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await getApiKeyQuota(id);
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    
    return NextResponse.json({ quota: result.quota });
  } catch (error) {
    console.error("[/api/keys/[id]/quota] Error:", error);
    return NextResponse.json({ error: "Failed to fetch quota" }, { status: 500 });
  }
}

// POST /api/keys/[id]/quota - Set quota for specific API key
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dailyLimit, monthlyLimit } = body;

    if (dailyLimit === undefined && monthlyLimit === undefined) {
      return NextResponse.json(
        { error: "At least one of dailyLimit or monthlyLimit is required" }, 
        { status: 400 }
      );
    }

    const result = await setApiKeyQuota(id, { dailyLimit, monthlyLimit });
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      quota: result.apiKey.quota 
    });
  } catch (error) {
    console.error("[/api/keys/[id]/quota] Error:", error);
    return NextResponse.json({ error: "Failed to set quota" }, { status: 500 });
  }
}
