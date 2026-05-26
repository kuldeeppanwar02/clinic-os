"use client";

import { useEffect, useState } from "react";
import { Camera, QrCode, Pointer, AlertTriangle, Stethoscope } from "lucide-react";

export default function PosterPage() {
  const [url, setUrl] = useState("https://your-clinic-link.com");

  useEffect(() => {
    // Dynamically set the URL to the current website domain
    if (typeof window !== "undefined") {
      setUrl(window.location.origin);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 print:py-0 print:bg-white font-sans">
      
      {/* Print Button (Hides when printing) */}
      <button 
        onClick={() => window.print()} 
        className="fixed top-4 right-4 bg-[var(--accent)] text-white px-6 py-2 rounded-full font-bold shadow-lg print:hidden hover:bg-emerald-600 transition"
      >
        🖨️ पोस्टर प्रिंट करें
      </button>

      {/* A4 Size Poster Canvas */}
      <div className="w-[210mm] h-[297mm] bg-white shadow-2xl print:shadow-none relative overflow-hidden flex flex-col items-center">
        
        {/* Top Header Background */}
        <div className="w-full bg-[#0f6b63] text-white text-center py-10 rounded-b-[40px] shadow-md z-10 relative">
          <h1 className="text-5xl font-black mb-4 tracking-wide leading-tight px-4">
            ऑनलाइन टोकन (पर्ची)<br/>यहाँ से बनाएँ
          </h1>
          <p className="text-xl font-medium opacity-90">बिना लाइन में लगे, अपने मोबाइल से</p>
        </div>

        {/* Warning Banner */}
        <div className="w-11/12 bg-red-600 text-white rounded-2xl p-4 mt-6 flex items-center gap-4 shadow-lg transform -translate-y-4">
          <AlertTriangle className="h-12 w-12 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-2xl font-black tracking-wide">कृपया ध्यान दें!</p>
            <p className="text-lg font-medium opacity-95">यह पेमेंट (PhonePe/Paytm) का QR नहीं है।</p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="mt-8 relative">
          {/* Decorative rings */}
          <div className="absolute inset-0 border-4 border-[#0f6b63] opacity-10 rounded-[30px] transform scale-110"></div>
          <div className="absolute inset-0 border-4 border-[#0f6b63] opacity-20 rounded-[30px] transform scale-105"></div>
          
          <div className="bg-white border-[6px] border-[#0f6b63] p-6 rounded-[30px] shadow-xl relative z-10">
            {/* The actual QR Code generated dynamically */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`}
              alt="Clinic QR Code"
              className="w-64 h-64"
            />
            
            {/* Medical Logo Overlay in the center of QR */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md border-2 border-[#0f6b63]">
              <Stethoscope className="h-8 w-8 text-[#0f6b63]" />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-gray-800 mt-12 mb-8 text-center border-b-4 border-[#67edaa] pb-2 px-8">
          स्कैन कैसे करें? (3 आसान स्टेप्स)
        </h2>

        {/* Steps Grid */}
        <div className="w-10/12 flex flex-col gap-8">
          
          {/* Step 1 */}
          <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="bg-[#e8f6f4] p-4 rounded-full flex-shrink-0 text-[#0f6b63]">
              <Camera className="h-10 w-10" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">स्टेप 1: कैमरा खोलें</p>
              <p className="text-lg text-gray-600 font-medium leading-snug mt-1">अपने फोन का नॉर्मल कैमरा या Paytm स्कैनर चालू करें।</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="bg-[#e8f6f4] p-4 rounded-full flex-shrink-0 text-[#0f6b63]">
              <QrCode className="h-10 w-10" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">स्टेप 2: स्कैन करें</p>
              <p className="text-lg text-gray-600 font-medium leading-snug mt-1">कैमरे को ऊपर दिए गए हरे QR कोड के सामने लाएं।</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="bg-[#e8f6f4] p-4 rounded-full flex-shrink-0 text-[#0f6b63]">
              <Pointer className="h-10 w-10" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">स्टेप 3: लिंक पर क्लिक करें</p>
              <p className="text-lg text-gray-600 font-medium leading-snug mt-1">स्क्रीन पर एक लिंक आएगा, उसे दबाएं और पर्ची बनाएं।</p>
            </div>
          </div>

        </div>

        {/* Footer Alternative */}
        <div className="w-full mt-auto bg-[#1a2320] text-center py-6 text-white px-8">
          <p className="text-lg font-medium text-gray-300">स्कैन करने में परेशानी हो रही है?</p>
          <p className="text-2xl font-black mt-1 tracking-wider text-[#67edaa]">
            Google पर जाएं और लिखें: <span className="bg-white/10 px-3 py-1 rounded-lg select-all">{url.replace(/^https?:\/\//, '')}</span>
          </p>
        </div>

      </div>

      {/* Print Styles injected locally */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
}
