import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;
    if (auth.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, date } = body;

    if (!name || !date) {
      return NextResponse.json({ error: "Missing name or date" }, { status: 400 });
    }

    const docRef = await addDoc(collection(db, "holidays"), {
      name,
      date,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Error adding holiday:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const q = query(collection(db, "holidays"), orderBy("date", "asc"));
    const querySnapshot = await getDocs(q);
    const holidays = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(holidays);
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
