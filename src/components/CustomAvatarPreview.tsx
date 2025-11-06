import { motion } from "framer-motion";

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

  const skinToneColors = {
    light: "#FFE0BD",
    medium: "#F1C27D",
    tan: "#C68642",
    dark: "#8D5524"
  };

  const hairColorValues = {
    black: "#2C1B18",
    brown: "#6F4E37",
    blonde: "#F4E7C3",
    red: "#A0522D",
    colorful: "linear-gradient(90deg, #FF0000, #00FF00, #0000FF)"
  };

  const expressionPaths = {
    encouraging: {
      mouth: "M 30 45 Q 40 50 50 45", // Warm smile
      eyes: "M 30 30 Q 32 28 34 30 M 46 30 Q 48 28 50 30" // Bright eyes
    },
    funny: {
      mouth: "M 28 43 Q 40 52 52 43", // Big grin
      eyes: "M 30 28 L 32 32 L 28 32 M 48 28 L 50 32 L 46 32" // Playful squint
    },
    professional: {
      mouth: "M 35 46 Q 40 48 45 46", // Calm smile
      eyes: "M 30 30 Q 32 29 34 30 M 46 30 Q 48 29 50 30" // Attentive
    },
    friendly: {
      mouth: "M 32 44 Q 40 49 48 44", // Gentle smile
      eyes: "M 30 30 Q 32 28 34 30 M 46 30 Q 48 28 50 30" // Kind
    }
  };

  const hairPaths = {
    short: "M 20 20 Q 15 10 20 5 L 25 10 L 30 8 L 35 10 L 40 5 L 45 8 L 50 10 L 55 8 L 60 5 Q 65 10 60 20",
    medium: "M 18 18 Q 12 8 18 3 L 22 12 L 28 10 L 35 8 L 40 5 L 45 8 L 52 10 L 58 12 L 62 3 Q 68 8 62 18 L 60 28 L 58 22 L 22 22 L 20 28",
    long: "M 16 16 Q 10 5 16 0 L 20 15 L 24 35 L 18 38 Q 15 28 16 16 M 64 16 Q 70 5 64 0 L 60 15 L 56 35 L 62 38 Q 65 28 64 16 M 25 10 L 30 12 L 35 10 L 40 5 L 45 10 L 50 12 L 55 10",
    curly: "M 18 15 Q 12 8 20 5 Q 18 12 22 15 Q 20 18 24 18 M 28 10 Q 26 15 30 18 Q 28 20 32 20 M 38 8 Q 36 12 40 15 Q 38 18 42 18 M 48 10 Q 46 15 50 18 Q 48 20 52 20 M 58 15 Q 62 8 60 5 Q 62 12 58 15 Q 60 18 56 18"
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} relative`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      key={JSON.stringify(customization)}
    >
      <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-lg">
        {/* Background circle */}
        <circle cx="40" cy="40" r="38" fill="hsl(var(--muted))" />
        
        {/* Face */}
        <circle cx="40" cy="40" r="28" fill={skinToneColors[customization.skinTone as keyof typeof skinToneColors]} />
        
        {/* Hair */}
        <g fill={hairColorValues[customization.hairColor as keyof typeof hairColorValues].startsWith('linear') 
          ? "url(#hair-gradient)" 
          : hairColorValues[customization.hairColor as keyof typeof hairColorValues]}>
          {customization.hairColor === 'colorful' && (
            <defs>
              <linearGradient id="hair-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF0000" />
                <stop offset="50%" stopColor="#00FF00" />
                <stop offset="100%" stopColor="#0000FF" />
              </linearGradient>
            </defs>
          )}
          <path d={hairPaths[customization.hairStyle as keyof typeof hairPaths]} />
        </g>
        
        {/* Eyes */}
        <g stroke="hsl(var(--foreground))" strokeWidth="2" fill="none">
          <path d={expressionPaths[customization.baseAvatar].eyes} />
        </g>
        
        {/* Nose */}
        <circle cx="40" cy="38" r="1.5" fill={skinToneColors[customization.skinTone as keyof typeof skinToneColors]} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
        
        {/* Mouth */}
        <path 
          d={expressionPaths[customization.baseAvatar].mouth} 
          stroke="hsl(var(--foreground))" 
          strokeWidth="2" 
          fill="none" 
          strokeLinecap="round"
        />
        
        {/* Accessories */}
        {customization.accessories.includes('glasses') && (
          <g stroke="hsl(var(--foreground))" strokeWidth="2" fill="none">
            <circle cx="30" cy="30" r="5" />
            <circle cx="50" cy="30" r="5" />
            <line x1="35" y1="30" x2="45" y2="30" />
          </g>
        )}
        
        {customization.accessories.includes('hat') && (
          <g fill="hsl(var(--primary))">
            <ellipse cx="40" cy="18" rx="18" ry="4" />
            <rect x="30" y="10" width="20" height="10" rx="2" />
          </g>
        )}
        
        {customization.accessories.includes('headphones') && (
          <g stroke="hsl(var(--foreground))" strokeWidth="3" fill="none">
            <path d="M 15 30 Q 15 15 25 12" strokeLinecap="round" />
            <path d="M 65 30 Q 65 15 55 12" strokeLinecap="round" />
            <rect x="12" y="28" width="8" height="10" rx="2" fill="hsl(var(--foreground))" />
            <rect x="60" y="28" width="8" height="10" rx="2" fill="hsl(var(--foreground))" />
          </g>
        )}
        
        {customization.accessories.includes('bow') && (
          <g fill="hsl(var(--primary))">
            <path d="M 30 15 L 28 10 L 35 12 L 30 15" />
            <path d="M 50 15 L 52 10 L 45 12 L 50 15" />
            <circle cx="40" cy="13" r="2" />
          </g>
        )}
      </svg>
      
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
