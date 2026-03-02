import { ComponentType } from "react";
import { PractaProps } from "@/types/flow";

import BreathingPause from "./breathing-pause";
import GratitudePrompt from "./gratitude-prompt";
import AIAffirmation from "./ai-affirmation";

export interface DemoPractaInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: ComponentType<PractaProps>;
}

export const demoPractas: DemoPractaInfo[] = [
  {
    id: "breathing-pause",
    name: "Breathing Pause",
    description: "A guided breathing exercise with animated orb and audio",
    icon: "wind",
    component: BreathingPause,
  },
  {
    id: "gratitude-prompt",
    name: "Gratitude Prompt",
    description: "A simple text input for gratitude reflection",
    icon: "heart",
    component: GratitudePrompt,
  },
  {
    id: "ai-affirmation",
    name: "AI Affirmation",
    description: "Get a personalized affirmation powered by context.ai",
    icon: "star",
    component: AIAffirmation,
  },
];

export function getDemoPracta(id: string): DemoPractaInfo | undefined {
  return demoPractas.find((p) => p.id === id);
}
