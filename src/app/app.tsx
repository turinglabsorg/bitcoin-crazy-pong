"use client";

import dynamic from "next/dynamic";


// note: dynamic import is required for components that use the Frame SDK
const Game = dynamic(() => import("~/components/Game"), {
  ssr: false,
});

export default function App() {
  return <Game />;
}
