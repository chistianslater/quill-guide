import { motion } from "framer-motion";
import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { bigSmile } from "@dicebear/collection";

interface CustomAvatarPreviewProps {
  customization: {
    baseAvatar: "encouraging" | "funny" | "professional" | "friendly";
    skinTone: string;
    hairStyle: string;
    hairColor: string;
    accessories: string[];
  };
  size?: "sm" | "md" | "lg";
}

export const CustomAvatarPreview = ({ customization, size = "lg" }: CustomAvatarPreviewProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  // Map our customization to DiceBear options
  const avatarSvg = useMemo(() => {
    const skinColorMap = {
      light: "ffdbb4",
      medium: "edb98a",
      tan: "d08b5b",
      dark: "ae5d29"
    };

    const hairColorMap = {
      black: "000000",
      brown: "6f4e37",
      blonde: "f4e7c3",
      red: "a0522d",
      colorful: "ff6b6b" // Bright red-pink for colorful
    };

    // Map hair styles to DiceBear hair types (bigSmile collection)
    type HairType = "bangs" | "bowlCutHair" | "braids" | "bunHair" | "curlyBob" | "curlyShortHair" | "froBun" | "halfShavedHead" | "mohawk" | "shavedHead" | "shortHair" | "straightHair" | "wavyBob";
    const hairStyleMap: Record<string, HairType[]> = {
      short: ["shortHair", "bowlCutHair"],
      medium: ["straightHair", "bangs"],
      long: ["braids", "bunHair"],
      curly: ["curlyBob", "curlyShortHair"]
    };

    // Map our personality to mouth expressions (valid bigSmile values)
    type MouthType = "awkwardSmile" | "braces" | "gapSmile" | "kawaii" | "openSad" | "openedSmile" | "teethSmile" | "unimpressed";
    const mouthMap: Record<string, MouthType[]> = {
      encouraging: ["openedSmile", "teethSmile"],
      funny: ["teethSmile", "kawaii"],
      professional: ["awkwardSmile", "openedSmile"],
      friendly: ["openedSmile", "gapSmile"]
    };

    // Map accessories to DiceBear eyes types (bigSmile collection)
    type EyesType = "angry" | "cheery" | "confused" | "normal" | "sad" | "sleepy" | "starstruck" | "winking";
    const hasGlasses = customization.accessories.includes("glasses");
    // Note: bigSmile doesn't have explicit glasses support, using eye expressions instead
    const eyesType: EyesType[] = hasGlasses ? ["starstruck", "cheery"] : ["normal", "cheery"];

    const avatar = createAvatar(bigSmile, {
      seed: JSON.stringify(customization),
      skinColor: [skinColorMap[customization.skinTone as keyof typeof skinColorMap]],
      hairColor: [hairColorMap[customization.hairColor as keyof typeof hairColorMap]],
      hair: hairStyleMap[customization.hairStyle] as HairType[],
      mouth: mouthMap[customization.baseAvatar] as MouthType[],
      eyes: eyesType,
      backgroundColor: ["transparent"],
    });

    return avatar.toString();
  }, [customization]);

  return (
    <motion.div
      className={`${sizeClasses[size]} relative`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      key={JSON.stringify(customization)}
    >
      <div 
        className="w-full h-full drop-shadow-lg rounded-full bg-muted/50 p-2"
        dangerouslySetInnerHTML={{ __html: avatarSvg }}
      />
      
      {/* Animated ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/40"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />
    </motion.div>
  );
};
