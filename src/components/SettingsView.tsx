import React, { useState } from 'react';
import { SettingsState } from '../types';

interface SettingsViewProps {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleSetting = (key: keyof SettingsState) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleClearCache = () => {
    showToast('நினைவகத் தரவுகள் அழிக்கப்பட்டன! (Cache cleared)');
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#8b4513] text-[#ffc29f] px-5 py-3 rounded-xl shadow-lg border border-[#dac2b6] font-bold text-sm flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#241a00] mb-1">அமைப்புகள்</h1>
        <p className="text-[#54433a] text-sm">
          உங்கள் பயன்பாட்டு அனுபவத்தை உங்கள் விருப்பப்படி மாற்றியமையுங்கள்
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance & Theme */}
        <div className="bg-[#ffffff] rounded-2xl border border-[#dac2b6] p-6 shadow-xs">
          <h3 className="text-lg font-bold text-[#241a00] mb-4 pb-3 border-b border-[#dac2b6]/60 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8b4513]">palette</span>
            <span>தோற்றம் (Appearance & Theme)</span>
          </h3>

          <div className="space-y-5">
            {/* Dark Mode */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#241a00] text-sm">இரவுப் பயன்முறை (Dark Mode)</h4>
                <p className="text-xs text-[#54433a]">
                  இரவில் வாசிக்க வசதியாகக் கருமைத் திரையை இயக்கும்
                </p>
              </div>
              <button
                onClick={() => toggleSetting('darkMode')}
                className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                  settings.darkMode ? 'bg-[#8b4513]' : 'bg-[#dac2b6]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-[#ffffff] transition-transform ${
                    settings.darkMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            {/* Theme Selector */}
            <div>
              <h4 className="font-bold text-[#241a00] text-sm mb-2">வண்ணத் தீம்</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setSettings((s) => ({ ...s, theme: 'traditional' }))}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    settings.theme === 'traditional'
                      ? 'bg-[#fff2d8] border-[#8b4513] text-[#6c2f00] shadow-xs'
                      : 'bg-[#ffffff] border-[#dac2b6] text-[#54433a]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#fff2d8] border border-[#8b4513]"></span>
                  <span>பாரம்பரியம் (Warm)</span>
                </button>

                <button
                  onClick={() => setSettings((s) => ({ ...s, theme: 'minimal' }))}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    settings.theme === 'minimal'
                      ? 'bg-[#ffffff] border-[#8b4513] text-[#241a00] shadow-xs'
                      : 'bg-[#ffffff] border-[#dac2b6] text-[#54433a]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#f8fafc] border border-[#94a3b8]"></span>
                  <span>நவீன வெண்மை</span>
                </button>

                <button
                  onClick={() => setSettings((s) => ({ ...s, theme: 'contrast' }))}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    settings.theme === 'contrast'
                      ? 'bg-[#241a00] border-[#8b4513] text-[#ffc29f] shadow-xs'
                      : 'bg-[#ffffff] border-[#dac2b6] text-[#54433a]'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#241a00] border border-[#ffc29f]"></span>
                  <span>உயர் முரண் (Contrast)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-[#ffffff] rounded-2xl border border-[#dac2b6] p-6 shadow-xs">
          <h3 className="text-lg font-bold text-[#241a00] mb-4 pb-3 border-b border-[#dac2b6]/60 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8b4513]">text_fields</span>
            <span>எழுத்துரு அமைப்புகள் (Typography)</span>
          </h3>

          <div className="space-y-5">
            {/* Font Size Step */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-[#241a00] text-sm">எழுத்து அளவு</h4>
                <span className="text-xs font-bold text-[#8b4513]">
                  {settings.fontSizeStep * 10 + 90}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => setSettings((s) => ({ ...s, fontSizeStep: step }))}
                    className={`py-2 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                      settings.fontSizeStep === step
                        ? 'bg-[#6c2f00] text-[#ffffff] border-[#6c2f00]'
                        : 'bg-[#fae7b6] text-[#241a00] border-[#dac2b6]'
                    }`}
                  >
                    {step === 1 ? 'சிறியது' : step === 2 ? 'சாதாரண' : step === 3 ? 'பெரியது' : 'மிகப்பெரியது'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dyslexic Font Toggle */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h4 className="font-bold text-[#241a00] text-sm">
                  டிஸ்லெக்சியா நட்பு எழுத்துரு (Dyslexic Font)
                </h4>
                <p className="text-xs text-[#54433a]">
                  வாசிப்பில் சிரமம் உள்ளவர்களுக்கான எளிதான எழுத்து வடிவம்
                </p>
              </div>
              <button
                onClick={() => toggleSetting('dyslexicFont')}
                className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                  settings.dyslexicFont ? 'bg-[#8b4513]' : 'bg-[#dac2b6]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-[#ffffff] transition-transform ${
                    settings.dyslexicFont ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications & Offline Data */}
        <div className="bg-[#ffffff] rounded-2xl border border-[#dac2b6] p-6 shadow-xs">
          <h3 className="text-lg font-bold text-[#241a00] mb-4 pb-3 border-b border-[#dac2b6]/60 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8b4513]">notifications</span>
            <span>அறிவிப்புகள் & தரவு (Preferences)</span>
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#241a00] text-sm">
                  தினசரி வாசிப்பு நினைவூட்டல்
                </h4>
                <p className="text-xs text-[#54433a]">
                  ஒவ்வொரு நாளும் மாலை 7 மணிக்கு வாசிக்க நினைவூட்டும்
                </p>
              </div>
              <button
                onClick={() => toggleSetting('dailyReminder')}
                className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                  settings.dailyReminder ? 'bg-[#8b4513]' : 'bg-[#dac2b6]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-[#ffffff] transition-transform ${
                    settings.dailyReminder ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-[#dac2b6]/40 pt-3">
              <div>
                <h4 className="font-bold text-[#241a00] text-sm">புதிய வரவுகள் அறிவிப்பு</h4>
                <p className="text-xs text-[#54433a]">
                  புதிய இலக்கிய நூல்கள் சேரும் போது தகவல் தெரிவிக்கும்
                </p>
              </div>
              <button
                onClick={() => toggleSetting('newArrivals')}
                className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                  settings.newArrivals ? 'bg-[#8b4513]' : 'bg-[#dac2b6]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-[#ffffff] transition-transform ${
                    settings.newArrivals ? 'translate-x-6' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-[#dac2b6]/40 pt-3">
              <div>
                <h4 className="font-bold text-[#241a00] text-sm">நினைவகத் தரவுகளை அழி</h4>
                <p className="text-xs text-[#54433a]">
                  ஆஃப்லைன் கேச் (Cache) கோப்புகளை நீக்கும்
                </p>
              </div>
              <button
                onClick={handleClearCache}
                className="px-4 py-2 rounded-xl bg-[#fee2e2] text-[#b91c1c] font-bold text-xs hover:bg-[#fca5a5] transition-colors cursor-pointer"
              >
                அழிக்க
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-4 text-xs text-[#54433a]">
          <p className="font-bold text-[#241a00]">ஓலைச்சுவடி v2.4.0</p>
          <p className="mt-1">தமிழ் டிஜிட்டல் இலக்கியப் பாரம்பரியத் தொகுப்பு</p>
        </div>
      </div>
    </div>
  );
};
