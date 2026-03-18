import { ISPCData } from "@/types";
import data from "../../public/data/ispc_data.json";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return <Dashboard data={data as ISPCData} />;
}
