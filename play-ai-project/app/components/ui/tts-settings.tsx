"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TTSSettings } from "@/lib/types/tts";

// Available voices
const VOICES = [
  {
    name: 'Angelo',
    accent: 'american',
    language: 'English (US)',
    languageCode: 'EN-US',
    value: 's3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json',
    sample: 'https://peregrine-samples.s3.us-east-1.amazonaws.com/parrot-samples/Angelo_Sample.wav',
    gender: 'male',
    style: 'Conversational',
  },
  {
    name: 'Deedee',
    accent: 'american',
    language: 'English (US)',
    languageCode: 'EN-US',
    value: 's3://voice-cloning-zero-shot/e040bd1b-f190-4bdb-83f0-75ef85b18f84/original/manifest.json',
    sample: 'https://peregrine-samples.s3.us-east-1.amazonaws.com/parrot-samples/Deedee_Sample.wav',
    gender: 'female',
    style: 'Conversational',
  },
  {
    name: 'Jennifer',
    accent: 'american',
    language: 'English (US)',
    languageCode: 'EN-US',
    value: 's3://voice-cloning-zero-shot/801a663f-efd0-4254-98d0-5c175514c3e8/jennifer/manifest.json',
    sample: 'https://peregrine-samples.s3.amazonaws.com/parrot-samples/jennifer.wav',
    gender: 'female',
    style: 'Conversational',
  },
  {
    name: 'Briggs',
    accent: 'american',
    language: 'English (US)',
    languageCode: 'EN-US',
    value: 's3://voice-cloning-zero-shot/71cdb799-1e03-41c6-8a05-f7cd55134b0b/original/manifest.json',
    sample: 'https://peregrine-samples.s3.us-east-1.amazonaws.com/parrot-samples/Briggs_Sample.wav',
    gender: 'male',
    style: 'Narrative',
  },
  {
    name: 'Samara',
    accent: 'american',
    language: 'English (US)',
    languageCode: 'EN-US',
    value: 's3://voice-cloning-zero-shot/90217770-a480-4a91-b1ea-df00f4d4c29d/original/manifest.json',
    sample: 'https://parrot-samples.s3.amazonaws.com/gargamel/Samara.wav',
    gender: 'female',
    style: 'Conversational',
  }
];

// Quality options
const QUALITY_OPTIONS = [
  { value: 'draft', label: 'Draft - Fastest' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'premium', label: 'Premium - Best Quality' },
];

// Output format options
const FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
  { value: 'ogg', label: 'OGG' },
  { value: 'flac', label: 'FLAC' },
  { value: 'mulaw', label: 'µ-law' },
  { value: 'raw', label: 'Raw' },
];

// Languages
const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'italian', label: 'Italian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'mandarin', label: 'Mandarin' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'arabic', label: 'Arabic' },
  // Add other languages as needed
];

interface TTSSettingsDialogProps {
  settings: TTSSettings;
  onSettingsChange: (settings: TTSSettings) => void;
}

export function TTSSettingsDialog({ settings, onSettingsChange }: TTSSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<TTSSettings>(settings);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleSettingChange = <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
  };

  const handleReset = () => {
    setLocalSettings({
      model: "Play3.0-mini",
      voice: VOICES[0].value,
      quality: "medium",
      outputFormat: "mp3",
      speed: 1,
      sampleRate: 24000,
      language: "english",
      seed: null,
      temperature: null,
      voiceGuidance: null,
      styleGuidance: null,
      textGuidance: 1,
    });
  };

  return (
    <Dialog onOpenChange={(open) => {
      if (!open) handleSave();
      if (open) setLocalSettings(settings);
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 h-8 px-2"
          title="TTS Settings"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">TTS</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Text-to-Speech Settings</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-2">
          {/* Voice Selection */}
          <div className="grid gap-2">
            <Label htmlFor="voice">Voice</Label>
            <Select 
              value={localSettings.voice} 
              onValueChange={(value) => handleSettingChange("voice", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.name} ({voice.gender}, {voice.style})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speed */}
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="speed">Speed</Label>
              <span className="text-xs text-muted-foreground">{localSettings.speed}x</span>
            </div>
            <Slider
              id="speed"
              min={0.1}
              max={3}
              step={0.1}
              value={[localSettings.speed]}
              onValueChange={(value) => handleSettingChange("speed", value[0])}
            />
          </div>
          
          {/* Quality */}
          <div className="grid gap-2">
            <Label htmlFor="quality">Quality</Label>
            <Select 
              value={localSettings.quality || "medium"} 
              onValueChange={(value) => handleSettingChange("quality", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="grid gap-2">
            <Label htmlFor="language">Language</Label>
            <Select 
              value={localSettings.language} 
              onValueChange={(value) => handleSettingChange("language", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="advanced-settings"
              checked={isAdvancedOpen}
              onCheckedChange={setIsAdvancedOpen}
            />
            <Label htmlFor="advanced-settings">Show Advanced Settings</Label>
          </div>

          {isAdvancedOpen && (
            <>
              {/* Advanced Settings Section */}
              <div className="grid gap-4 border-t pt-4 mt-2">
                {/* Output Format */}
                <div className="grid gap-2">
                  <Label htmlFor="outputFormat">Output Format</Label>
                  <Select 
                    value={localSettings.outputFormat} 
                    onValueChange={(value) => handleSettingChange("outputFormat", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sample Rate */}
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sampleRate">Sample Rate</Label>
                    <span className="text-xs text-muted-foreground">{localSettings.sampleRate} Hz</span>
                  </div>
                  <Slider
                    id="sampleRate"
                    min={8000}
                    max={48000}
                    step={1000}
                    value={[localSettings.sampleRate]}
                    onValueChange={(value) => handleSettingChange("sampleRate", value[0])}
                  />
                </div>

                {/* Voice Guidance */}
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="voiceGuidance">Voice Uniqueness</Label>
                    <span className="text-xs text-muted-foreground">
                      {localSettings.voiceGuidance === null ? "Default" : localSettings.voiceGuidance}
                    </span>
                  </div>
                  <Slider
                    id="voiceGuidance"
                    min={1}
                    max={2}
                    step={0.1}
                    value={[localSettings.voiceGuidance || 1.5]}
                    onValueChange={(value) => handleSettingChange("voiceGuidance", value[0])}
                    disabled={localSettings.voiceGuidance === null}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-voice-guidance"
                      checked={localSettings.voiceGuidance !== null}
                      onCheckedChange={(checked) => 
                        handleSettingChange("voiceGuidance", checked ? 1.5 : null)
                      }
                    />
                    <Label htmlFor="use-voice-guidance" className="text-xs">
                      Enable voice uniqueness control
                    </Label>
                  </div>
                </div>
                
                {/* Style Guidance */}
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="styleGuidance">Emotional Intensity</Label>
                    <span className="text-xs text-muted-foreground">
                      {localSettings.styleGuidance === null ? "Default" : localSettings.styleGuidance}
                    </span>
                  </div>
                  <Slider
                    id="styleGuidance"
                    min={1}
                    max={10}
                    step={0.5}
                    value={[localSettings.styleGuidance || 5]}
                    onValueChange={(value) => handleSettingChange("styleGuidance", value[0])}
                    disabled={localSettings.styleGuidance === null}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-style-guidance"
                      checked={localSettings.styleGuidance !== null}
                      onCheckedChange={(checked) => 
                        handleSettingChange("styleGuidance", checked ? 5 : null)
                      }
                    />
                    <Label htmlFor="use-style-guidance" className="text-xs">
                      Enable emotional intensity control
                    </Label>
                  </div>
                </div>
                
                {/* Text Guidance */}
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="textGuidance">Text Adherence</Label>
                    <span className="text-xs text-muted-foreground">{localSettings.textGuidance}</span>
                  </div>
                  <Slider
                    id="textGuidance"
                    min={1}
                    max={2}
                    step={0.1}
                    value={[localSettings.textGuidance]}
                    onValueChange={(value) => handleSettingChange("textGuidance", value[0])}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>More Fluid</span>
                    <span>More Accurate</span>
                  </div>
                </div>
                
                {/* Seed */}
                <div className="grid gap-2">
                  <Label htmlFor="seed">Random Seed</Label>
                  <div className="flex gap-2">
                    <Input
                      id="seed"
                      type="number"
                      min={0}
                      value={localSettings.seed === null ? "" : localSettings.seed}
                      onChange={(e) => {
                        const value = e.target.value === "" ? null : Number(e.target.value);
                        handleSettingChange("seed", value);
                      }}
                      placeholder="Random"
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSettingChange("seed", null)}
                      title="Use random seed"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set a specific seed for consistent results or leave empty for random.
                  </p>
                </div>
                
                {/* Temperature */}
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="temperature">Variation (Temperature)</Label>
                    <span className="text-xs text-muted-foreground">
                      {localSettings.temperature === null ? "Default" : localSettings.temperature}
                    </span>
                  </div>
                  <Slider
                    id="temperature"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[localSettings.temperature || 1]}
                    onValueChange={(value) => handleSettingChange("temperature", value[0])}
                    disabled={localSettings.temperature === null}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-temperature"
                      checked={localSettings.temperature !== null}
                      onCheckedChange={(checked) => 
                        handleSettingChange("temperature", checked ? 1 : null)
                      }
                    />
                    <Label htmlFor="use-temperature" className="text-xs">
                      Enable temperature control
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between mt-4">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <DialogClose asChild>
            <Button size="sm" onClick={handleSave}>
              Apply
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
} 