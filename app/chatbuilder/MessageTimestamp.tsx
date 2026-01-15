"use client";

import { useState, useEffect } from "react";

export default function MessageTimestamp({ timestamp }: { timestamp: Date }) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setCurrentTime(new Date(timestamp).toLocaleTimeString());
  }, [timestamp]);

  return (
    <span className="text-xs mt-1 opacity-60" suppressHydrationWarning>
      {currentTime}
    </span>
  );
}