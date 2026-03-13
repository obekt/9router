import { NextResponse } from "next/server";
import { deleteApiKey } from "@/lib/localDb";

export const dynamic = "force-dynamic";

// DELETE /api/keys/[id] - Delete API key
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const success = await deleteApiKey(id);
    
    if (!success) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/keys/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
  }
}
