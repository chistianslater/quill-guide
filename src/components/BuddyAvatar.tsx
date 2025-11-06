import { motion } from "framer-motion";
import { Sparkles, Smile, Briefcase, Heart } from "lucide-react";

interface BuddyAvatarProps {
  personality: "encouraging" | "funny" | "professional" | "friendly";
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export const BuddyAvatar = ({ personality, size = "md", animate = true }: BuddyAvatarProps) => {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  const personalities = {
    encouraging: {
      gradient: "from-orange-400 via-pink-500 to-red-500",
      icon: Heart,
      animation: {
        scale: [1, 1.1, 1],
        rotate: [0, -5, 5, -5, 0],
      },
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 3
      }
    },
    funny: {
      gradient: "from-yellow-400 via-orange-400 to-pink-500",
      icon: Smile,
      animation: {
        rotate: [0, -15, 15, -15, 15, 0],
        scale: [1, 1.2, 0.9, 1.1, 1],
      },
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 4
      }
    },
    professional: {
      gradient: "from-blue-500 via-indigo-600 to-purple-600",
      icon: Briefcase,
      animation: {
        y: [0, -3, 0],
      },
      transition: {
        duration: 2,
        repeat: Infinity,
      }
    },
    friendly: {
      gradient: "from-green-400 via-teal-500 to-blue-500",
      icon: Sparkles,
      animation: {
        scale: [1, 1.05, 1],
        rotate: [0, 2, -2, 0],
      },
      transition: {
        duration: 3,
        repeat: Infinity,
      }
    }
  };

  const config = personalities[personality];
  const IconComponent = config.icon;

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg relative overflow-hidden`}
      animate={animate ? config.animation : {}}
      transition={config.transition}
    >
      {/* Sparkle effect */}
      <motion.div
        className="absolute inset-0 bg-white/20"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1
        }}
      />
      
      {/* Icon */}
      <IconComponent 
        className={`text-white ${size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-8 h-8' : 'w-12 h-12'} relative z-10`}
        strokeWidth={2.5}
      />
      
      {/* Pulse ring */}
      {animate && (
        <motion.div
          className={`absolute inset-0 rounded-full border-2 border-white/40`}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      )}
    </motion.div>
  );
};
