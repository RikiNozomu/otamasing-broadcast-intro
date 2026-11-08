/**
 * Whether the scene is on its way out (Active moved on). The intro scenes read it to play their exit
 * (panels slide away, text folds up) just before the transition covers them.
 */
import { createContext, useContext } from "react";

export const LeavingContext = createContext(false);
export const useLeaving = () => useContext(LeavingContext);
