"use client";

import {
  motion,
  useReducedMotion
} from "framer-motion";

export function PageShell({
  children
}: {
  children:
    React.ReactNode;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      className="ui-page"
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 8
            }
      }
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration:
          reduceMotion
            ? 0
            : 0.22,
        ease: [
          0.22,
          1,
          0.36,
          1
        ]
      }}
    >
      {children}
    </motion.div>
  );
}
