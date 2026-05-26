"use client";

import { useRef, useState } from "react";
import {
  Camera,
  X,
  Send,
  SkipForward,
  Loader2,
  ImagePlus,
  CheckCircle2,
  Trash2,
} from "lucide-react";

type Props = {
  tokenId: string;
  patientName: string;
  clinicId: string;
  createdBy: string;
  onDone: () => void;
  onClose: () => void;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Photo read failed."));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(dataUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxDimension = 1600;
      const longestSide = Math.max(image.width, image.height);
      const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas not supported."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => reject(new Error("Image load failed."));
    image.src = dataUrl;
  });
}

async function compressImageFile(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  return compressDataUrl(dataUrl);
}

export function PrescriptionModal({
  tokenId,
  patientName,
  clinicId,
  createdBy,
  onDone,
  onClose,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const availableSlots = Math.max(0, 3 - photos.length);
    const selectedFiles = files.slice(0, availableSlots);

    if (selectedFiles.length === 0) {
      e.target.value = "";
      return;
    }

    try {
      const compressed = await Promise.all(
        selectedFiles.map((file) => compressImageFile(file)),
      );
      setPhotos((prev) => [...prev, ...compressed].slice(0, 3));
    } catch {
      window.alert("Photo prepare nahi ho payi. Dobara try karein.");
    } finally {
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (photos.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          tokenId,
          patientName,
          photos,
          createdBy,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Prescription send failed.");
      }

      setSent(true);
      window.setTimeout(() => {
        onDone();
      }, 1200);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Prescription send failed.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)] px-4 backdrop-blur-sm">
      <div className="card card-elevated w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between bg-[var(--accent-soft)] px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              Prescription Photo
            </p>
            <p className="mt-0.5 text-sm font-bold text-[var(--accent-strong)]">
              {tokenId} - {patientName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {sent ? (
            <div className="fade-up flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-soft)]">
                <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
              </div>
              <p className="mt-3 text-base font-bold text-[var(--success)]">
                Pharmacy ko bhej diya
              </p>
              <p className="mt-1 text-xs text-[rgba(19,49,58,0.5)]">
                {photos.length} photo - {tokenId}
              </p>
            </div>
          ) : (
            <>
              {photos.length > 0 && (
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="group relative">
                      <img
                        src={photo}
                        alt={`Prescription ${index + 1}`}
                        className="h-24 w-full rounded-lg border border-[var(--line)] object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--danger)] text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleCapture}
                className="hidden"
              />

              <div className="flex flex-col gap-2">
                {photos.length < 3 && (
                  <button
                    type="button"
                    className="btn btn-outline w-full"
                    onClick={() => fileRef.current?.click()}
                  >
                    {photos.length === 0 ? (
                      <>
                        <Camera className="h-4 w-4" /> Photo lein
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-4 w-4" /> Aur photo jodein ({photos.length}/3)
                      </>
                    )}
                  </button>
                )}

                {photos.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => void handleSend()}
                    disabled={sending}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin-slow" /> Bhej rahe hain...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Pharmacy ko bhejein
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-ghost w-full text-[rgba(19,49,58,0.5)]"
                  onClick={onDone}
                  disabled={sending}
                >
                  <SkipForward className="h-4 w-4" /> Skip karein
                </button>
              </div>

              <p className="mt-3 text-center text-[10px] text-[rgba(19,49,58,0.35)]">
                Photo seedhe pharmacy dashboard par dikhegi.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
