"use client";
import dynamic from "next/dynamic";

const DashboardTutorialPopUp = dynamic(() => import("../components/DashboardTutorialPopUp"), { ssr: false });

export default DashboardTutorialPopUp;
