// SecurityModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SecurityModal({ isOpen, message, onConfirm, onCancel }) {
  const [code, setCode] = useState("");
  const inputRef = useRef(null);

  // autofocus when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex items-center space-x-2 bg-red-600 px-6 py-4">
              <Lock className="w-6 h-6 text-white" />
              <h3 className="text-xl font-semibold text-white">
                {message}
              </h3>
            </div>

            <div className="px-6 py-5">
              <label htmlFor="sec-code" className="block text-gray-700 mb-2">
                Security Code
              </label>
              <input
                id="sec-code"
                ref={inputRef}
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                placeholder="••••••"
              />
            </div>

            <div className="flex justify-end px-6 py-4 bg-gray-50 space-x-3">
              <button
                onClick={() => { setCode(""); onCancel(); }}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition transform hover:-translate-y-0.5"
              >
                Cancel
              </button>
              <button
                onClick={() => { onConfirm(code); setCode(""); }}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition transform hover:-translate-y-0.5"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
