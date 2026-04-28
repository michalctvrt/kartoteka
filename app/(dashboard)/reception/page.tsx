"use client";

import ReceptionTodayList from "@/components/ReceptionTodayList";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ReceptionMessagesBlock from "@/components/ReceptionMessagesBlock";
import NewPatientBox from "@/components/NewPatientBox";

export default function ReceptionHomePage() {
  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 🧾 Levá část – dnešní objednávky */}
      <ReceptionTodayList />

      {/* 📦 Pravá část – novinky a zprávy */}
      <div className="space-y-6">
        {/* 🩺 Nový pacient */}
        <Card>
          <CardHeader>
            <CardTitle>🩺 Nový pacient</CardTitle>
          </CardHeader>
          <CardContent>
            <NewPatientBox />
          </CardContent>
        </Card>

        {/* 🗞️ Aktuality a provozní zprávy */}
        <Card>
          <CardHeader>
            <CardTitle>📞 Aktuality a provozní zprávy</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceptionMessagesBlock />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
