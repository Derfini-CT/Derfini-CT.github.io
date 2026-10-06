"use client";

import { useEffect, useState } from "react";
import Portfolio from "@/components/portfolio";
import { getPortfolioContent, portfolioSnapshot } from "@/lib/portfolio/content";

export default function PublicPortfolio() {
  const [content, setContent] = useState(portfolioSnapshot);
  useEffect(() => {
    let cancelled = false;
    void getPortfolioContent().then(result => { if (!cancelled) setContent(result); });
    return () => { cancelled = true; };
  }, []);
  return <Portfolio content={content} />;
}
