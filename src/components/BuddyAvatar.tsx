import { motion } from "framer-motion";
import encouragingAvatar from "@/assets/buddy-encouraging.png";
import funnyAvatar from "@/assets/buddy-funny.png";
import professionalAvatar from "@/assets/buddy-professional.png";
import friendlyAvatar from "@/assets/buddy-friendly.png";

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
      avatar: encouragingAvatar,
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
      avatar: funnyAvatar,
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
      avatar: professionalAvatar,
      animation: {
        y: [0, -3, 0],
      },
      transition: {
        duration: 2,
        repeat: Infinity,
      }
    },
    friendly: {
      avatar: friendlyAvatar,
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

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-full shadow-lg relative overflow-hidden`}
      animate={animate ? config.animation : {}}
      transition={config.transition}
    >
      <img 
        src={config.avatar} 
        alt={`${personality} buddy avatar`}
        className="w-full h-full object-cover"
      />
      
      {/* Pulse ring */}
      {animate && (
        <motion.div
          className={`absolute inset-0 rounded-full border-2 border-primary/40`}
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
