import * as dotenv from "dotenv";
// Automatically load environment variables from .env.local
dotenv.config({ path: ".env.local" });

import { getUnitHistory } from "../lib/data";

async function main() {
  const args = process.argv.slice(2);
  const unitId = args[0] || "HT144";
  
  // Default to 7-day lookback to match IRYS UI defaults
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const dateStart = args[1] || sevenDaysAgo.toISOString();
  const dateEnd = args[2] || now.toISOString();

  console.log("\n=========================================");
  console.log(`INTECS API DIAGNOSTIC TOOL`);
  console.log("=========================================");
  console.log(`Usage: npx tsx scripts/test.ts [unitId] [dateStart] [dateEnd]`);
  console.log(`\nUnit:  ${unitId}`);
  console.log(`Start: ${dateStart}`);
  console.log(`End:   ${dateEnd}`);
  console.log("-----------------------------------------");

  try {
    const history = await getUnitHistory(unitId, { 
      dateRange: { 
        dateStart, 
        dateEnd
      } 
    });

    console.log(`✅ Connection Successful!`);
    if (history.unit) {
      console.log(`📍 Last GPS: lat ${history.unit.last_lat}, lon ${history.unit.last_lon}`);
    }
    console.log("-----------------------------------------");
    console.log(`📊 DATASET SIZES RECEIVED:`);
    console.log(`- Fuel/GPS Records:  ${history.fuelData?.length || 0}`);
    console.log(`- Autolube Records:  ${history.autolubeData?.length || 0}`);
    console.log(`- Fire (Ansul) Recs: ${history.ansulData?.length || 0}`);
    console.log(`- Muster Records:    ${history.musterData?.length || 0}`);
    console.log("=========================================\n");

    // Print latest 3 Ansul events as an example to easily verify timestamps
    if (history.ansulData && history.ansulData.length > 0) {
      console.log(`🔥 LATEST FIRE (ANSUL) EVENTS:`);
      // Sort chronologically descending (newest first)
      const sorted = [...history.ansulData].sort((a, b) => {
        const timeA = Date.parse(a.events?.eventDate || a.createdAt || "") || 0;
        const timeB = Date.parse(b.events?.eventDate || b.createdAt || "") || 0;
        return timeB - timeA;
      });
      // Display the 3 newest events
      const latest = sorted.slice(0, 3);
      for (const rec of latest) {
        console.log(`  [${rec.events?.eventDate || rec.createdAt || "—"}] ID: ${rec.events?.eventId || "—"} - ${rec.events?.eventDesc || "—"}`);
      }
      console.log("");
    }

  } catch (e) {
    console.error(`API Request Failed:`, e);
  }
}

main();
