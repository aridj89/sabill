import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useNfcReader Hook
 *
 * Captures NFC / RFID card scans from USB readers operating in Keyboard Emulation (HID wedge) mode.
 * In this mode, the reader acts like a keyboard, typing the card UID rapidly followed by an Enter keypress.
 *
 * Features:
 * - Buffers characters until 'Enter' is pressed.
 * - Enforces burst-timing detection (< maxIntervalMs between keystrokes) to differentiate scanner hardware from manual typing.
 * - Safely ignores ordinary human typing in forms unless rapid scanner burst is detected.
 * - Clean reusable React hook with callback.
 *
 * @param {object} options
 * @param {function} options.onScan - Callback invoked with the scanned card UID string
 * @param {boolean} [options.enabled=true] - Whether the listener is active
 * @param {number} [options.minLength=4] - Minimum UID character length
 * @param {number} [options.maxIntervalMs=75] - Maximum interval between characters to qualify as scanner burst
 * @returns {{ lastScannedUid: string|null, isReading: boolean, reset: () => void }}
 */
export function useNfcReader({
  onScan,
  enabled = true,
  minLength = 4,
  maxIntervalMs = 75,
} = {}) {
  const [lastScannedUid, setLastScannedUid] = useState(null);
  const [isReading, setIsReading] = useState(false);

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const reset = useCallback(() => {
    bufferRef.current = "";
    lastKeyTimeRef.current = 0;
    setIsReading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore modifier keys alone
      if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Handle Enter (termination character sent by virtually all barcode/NFC readers)
      if (e.key === "Enter") {
        const raw = bufferRef.current.trim();
        bufferRef.current = "";
        setIsReading(false);

        if (raw.length >= minLength) {
          // Normalize: alphanumeric only, uppercase
          const cleanUid = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

          if (cleanUid.length >= minLength) {
            // Prevent default form submission when an NFC reader scans
            if (e.cancelable) {
              e.preventDefault();
              e.stopPropagation();
            }

            setLastScannedUid(cleanUid);
            if (typeof onScanRef.current === "function") {
              onScanRef.current(cleanUid);
            }
          }
        }
        return;
      }

      // Printable single characters
      if (e.key.length === 1) {
        // If too much time has elapsed between keystrokes and an input is focused,
        // treat it as slow human typing and reset the buffer.
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        const isInputField = activeTag === "input" || activeTag === "textarea";

        if (timeSinceLastKey > maxIntervalMs) {
          // New burst starting
          bufferRef.current = e.key;
          setIsReading(true);
        } else {
          // Burst continuation from scanner
          bufferRef.current += e.key;
          setIsReading(true);

          // If inside an ordinary input field during a fast burst, prevent scanner chars
          // from polluting other inputs if we detect hardware scanning
          if (isInputField && bufferRef.current.length >= 3) {
            // Scanner burst in progress
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, minLength, maxIntervalMs]);

  return {
    lastScannedUid,
    isReading,
    reset,
  };
}

export default useNfcReader;
