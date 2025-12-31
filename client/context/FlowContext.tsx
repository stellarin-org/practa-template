import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import {
  FlowDefinition,
  FlowExecutionState,
  PractaOutput,
  PractaContext,
  PractaCompleteHandler,
  FlowCompleteHandler,
} from "@/types/flow";
import { resolveAssets } from "@/lib/practa-assets";

interface FlowContextValue {
  currentFlow: FlowExecutionState | null;
  startFlow: (flow: FlowDefinition) => void;
  completeCurrentPracta: (output: PractaOutput) => void;
  abortFlow: () => void;
  getCurrentPractaContext: () => PractaContext | null;
  onFlowComplete?: FlowCompleteHandler;
  setOnFlowComplete: (handler: FlowCompleteHandler | undefined) => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

function generateFlowId(): string {
  return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [currentFlow, setCurrentFlow] = useState<FlowExecutionState | null>(null);
  const [onFlowComplete, setOnFlowComplete] = useState<FlowCompleteHandler | undefined>();

  const startFlow = useCallback((flowDefinition: FlowDefinition) => {
    const newFlow: FlowExecutionState = {
      flowId: generateFlowId(),
      flowDefinition,
      currentIndex: 0,
      practaOutputs: [],
      status: "running",
      startedAt: new Date().toISOString(),
    };
    setCurrentFlow(newFlow);
  }, []);

  const completeCurrentPracta = useCallback((output: PractaOutput) => {
    setCurrentFlow((prev) => {
      if (!prev || prev.status !== "running") return prev;

      const newOutputs = [...prev.practaOutputs, output];
      const nextIndex = prev.currentIndex + 1;
      const isComplete = nextIndex >= prev.flowDefinition.practas.length;

      const updatedFlow: FlowExecutionState = {
        ...prev,
        practaOutputs: newOutputs,
        currentIndex: nextIndex,
        status: isComplete ? "completed" : "running",
        completedAt: isComplete ? new Date().toISOString() : undefined,
      };

      if (isComplete && onFlowComplete) {
        setTimeout(() => onFlowComplete(updatedFlow), 0);
      }

      return updatedFlow;
    });
  }, [onFlowComplete]);

  const abortFlow = useCallback(() => {
    setCurrentFlow((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: "aborted",
        completedAt: new Date().toISOString(),
      };
    });
  }, []);

  const getCurrentPractaContext = useCallback((): PractaContext | null => {
    if (!currentFlow || currentFlow.status !== "running") return null;

    const { flowId, currentIndex, practaOutputs, flowDefinition } = currentFlow;
    const currentPracta = flowDefinition.practas[currentIndex];

    const context: PractaContext = {
      flowId,
      practaIndex: currentIndex,
      assets: resolveAssets(currentPracta.type),
    };

    if (currentIndex > 0 && practaOutputs.length > 0) {
      const previousOutput = practaOutputs[currentIndex - 1];
      const previousPracta = flowDefinition.practas[currentIndex - 1];
      
      context.previous = {
        practaId: previousPracta.id,
        practaType: previousPracta.type,
        content: previousOutput.content,
        metadata: previousOutput.metadata,
      };
    }

    return context;
  }, [currentFlow]);

  const value = useMemo(
    () => ({
      currentFlow,
      startFlow,
      completeCurrentPracta,
      abortFlow,
      getCurrentPractaContext,
      onFlowComplete,
      setOnFlowComplete,
    }),
    [currentFlow, startFlow, completeCurrentPracta, abortFlow, getCurrentPractaContext, onFlowComplete]
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error("useFlow must be used within a FlowProvider");
  }
  return context;
}

export function useCurrentPracta() {
  const { currentFlow, getCurrentPractaContext, completeCurrentPracta } = useFlow();
  
  const currentPracta = useMemo(() => {
    if (!currentFlow || currentFlow.status !== "running") return null;
    return currentFlow.flowDefinition.practas[currentFlow.currentIndex];
  }, [currentFlow]);

  const context = getCurrentPractaContext();

  return {
    practa: currentPracta,
    context,
    complete: completeCurrentPracta,
  };
}
