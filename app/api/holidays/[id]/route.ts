import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, deleteDoc } from "firebase/firestore";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;
    if (auth.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    await deleteDoc(doc(db, "holidays", id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
