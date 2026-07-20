import React, { useState, useEffect } from 'react';
import { Calendar, Bot, CheckCircle2, MousePointer2, Video as VideoIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const T = [0, 0.12, 0.15, 0.25, 0.3, 0.35, 0.45, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.95, 1];

const TypewriterText = ({ text, delay = 0, speed = 30, isDeleting = false, deleteDelay = 0, deleteSpeed = 5, className, showFinalCursor = false }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Typing effect
  useEffect(() => {
    if (isDeleting) return;

    let interval;
    let index = 0;
    setDisplayedText('');
    setIsFinished(false);
    
    const startTyping = () => {
      setIsTyping(true);
      interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
          setIsFinished(true);
        }
      }, speed);
    };

    const initialTimeout = setTimeout(startTyping, delay);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [text, delay, speed, isDeleting]);

  // Deleting effect
  useEffect(() => {
    if (!isDeleting) return;

    let interval;
    const timeout = setTimeout(() => {
      setIsFinished(false);
      setIsTyping(true);

      interval = setInterval(() => {
        setDisplayedText(prev => {
          if (prev.length > 0) {
            return prev.slice(0, -2); // delete 2 chars at a time for speed
          } else {
            clearInterval(interval);
            setIsTyping(false);
            return '';
          }
        });
      }, deleteSpeed);
    }, deleteDelay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isDeleting, deleteSpeed, deleteDelay]);

  return (
    <span className={className}>
      {displayedText}
      {isTyping && (
         <span className={`inline-block w-[2px] h-[1em] ml-[2px] bg-[#333333] align-middle animate-pulse ${displayedText.length === 0 ? 'opacity-0' : 'opacity-100'}`} />
      )}
      {!isTyping && isFinished && showFinalCursor && !isDeleting && (
         <span className={`inline-block w-[2px] h-[1em] ml-[2px] bg-[#333333] align-middle animate-pulse`} />
      )}
    </span>
  );
};

const seoVariations = [
  {
    title: "How to Go Viral on TikTok in 2024 🚀 (Secret Algorithm Strategy)",
    desc: "Want to know the secret to getting 1M views? 🤫 In this video, I break down the exact algorithm hack that top creators are using to dominate. Save this so you don't forget! 👇",
    tags: "#TikTokGrowth #ViralStrategy #ContentCreator #AlgorithmHack #Shorts"
  },
  {
    title: "3 Editing Tricks to Keep Viewers Hooked 🔥 (CapCut Tutorial)",
    desc: "Watch time is everything. If you want people to stay until the end, you NEED these 3 quick editing tricks. Try them on your next video and watch your retention skyrocket! 📈",
    tags: "#VideoEditing #CapCutTips #CreatorTips #WatchTime #EditLikeAPro"
  },
  {
    title: "Why Your Shorts Aren't Getting Views (And How to Fix It) 📉➡️📈",
    desc: "Stuck at 200 views? You're probably making this ONE massive mistake in your hook. I analyzed 100 viral shorts and found the exact formula to break out of the 200 view jail. 🔓",
    tags: "#200ViewJail #YouTubeShorts #AlgorithmTips #CreatorGrowth #Virality"
  },
  {
    title: "I Tried Posting 3 Times a Day for a Month. Here's What Happened 🤯",
    desc: "Does posting frequency actually matter? I put my account on the line to find out if volume beats quality. The results completely surprised me... Watch until the end! 😱",
    tags: "#ContentStrategy #CreatorJourney #GrowthHacks #SocialMediaExperiment"
  },
  {
    title: "Best AI Tools for Content Creators in 2024 🤖 (Save 10+ Hours)",
    desc: "Stop doing everything manually! These AI tools completely changed my workflow. From auto-captions to infinite content ideas, this is the ultimate stack for modern creators. 💻",
    tags: "#AITools #CreatorEconomy #ProductivityHacks #TechForCreators"
  },
  {
    title: "How to Make $10,000/Month as a Micro-Influencer 💰 (No Sponsors)",
    desc: "You don't need millions of followers to make a full-time income. In this breakdown, I share the exact monetization strategy for creators with under 10k followers. Let's get paid! 💸",
    tags: "#CreatorMonetization #MicroInfluencer #MakeMoneyOnline #SideHustle"
  },
  {
    title: "The Ultimate Guide to YouTube Shorts Hook Structures 🪝",
    desc: "Your video lives or dies in the first 3 seconds. Here are 5 psychological hook frameworks that grab attention and refuse to let go. Number 4 is my absolute favorite. 🧠",
    tags: "#HookStrategy #ViewerRetention #YouTubeHacks #MarketingTips"
  },
  {
    title: "Day in the Life of a Full-Time Content Creator 🎥 (Behind the Scenes)",
    desc: "Ever wonder what goes into making these videos? Come with me as I script, shoot, and edit a full week of content in just one day. It's not always as glamorous as it looks! 😅",
    tags: "#DayInTheLife #Vlog #CreatorLife #BehindTheScenes #CreativeProcess"
  },
  {
    title: "Stop Using These 5 Banned Words on TikTok! 🚫 (Shadowban Warning)",
    desc: "Is your account shadowbanned? If your views dropped randomly, you might be triggering the spam filter. Avoid these 5 common words to keep your account safe and thriving! 🛡️",
    tags: "#Shadowbanned #TikTokTips #AlgorithmUpdate #CommunityGuidelines"
  },
  {
    title: "How to Build a Faceless YouTube Automation Empire in 2024 👑",
    desc: "Don't want to show your face? No problem. Faceless channels are printing money right now. Here is the step-by-step blueprint to starting your own automated cash-cow channel. 🐄💵",
    tags: "#FacelessChannel #YouTubeAutomation #CashCow #PassiveIncome"
  }
];

const AnimatedSEOCard = () => {
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // 9.5s typing/reading time + 1.5s deleting = 11s loop
    const interval = setInterval(() => {
      setIsDeleting(true);
      setTimeout(() => {
        setIsDeleting(false);
        setIndex(prev => prev + 1);
      }, 1500); // 1.5 seconds to backspace sequentially
    }, 11000);

    return () => clearInterval(interval);
  }, []);

  const currentSEO = seoVariations[index % seoVariations.length];

  return (
    <div className="w-full h-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 flex flex-col gap-4 relative group-hover:scale-[1.02] transition-transform duration-500">
      <div className="absolute top-4 right-4 bg-[#10a37f]/10 text-[#10a37f] px-2 py-1 rounded-md text-[10px] font-bold flex items-center shadow-sm">
        Auto Generated
      </div>
      <div className="w-full mt-2">
        <div className="text-[11px] uppercase tracking-wider text-brand-on-surface-variant/60 font-medium mb-1">SEO Title</div>
        <div className="w-full p-3 bg-brand-surfaceBg rounded-lg text-[14px] font-bold text-brand-secondary shadow-sm min-h-[46px]">
          <TypewriterText text={currentSEO.title} delay={500} speed={25} isDeleting={isDeleting} deleteDelay={900} />
        </div>
      </div>
      <div className="w-full flex-1 flex flex-col">
        <div className="text-[11px] uppercase tracking-wider text-brand-on-surface-variant/60 font-medium mb-1">Optimized Description</div>
        <div className="w-full p-3 bg-brand-surfaceBg rounded-lg text-[13px] text-brand-on-surface-variant flex-1 shadow-sm flex flex-col justify-between">
          <span className="min-h-[60px]">
            <TypewriterText text={currentSEO.desc} delay={2600} speed={15} isDeleting={isDeleting} deleteDelay={300} />
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] to-[#ff6118] mt-4 font-bold text-[12px] min-h-[20px]">
            <TypewriterText text={currentSEO.tags} delay={5800} speed={20} showFinalCursor={true} isDeleting={isDeleting} deleteDelay={0} />
          </span>
        </div>
      </div>
    </div>
  );
};

const ScheduleAnimation = () => {
  return (
    <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-brand-surface flex items-center justify-center p-6 group">
      <div className="w-full h-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
        
        {/* Screen 1: Video & Post Button */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center gap-8 p-4"
          animate={{
            scale: [1, 1, 1, 1, 1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.5, 0, 0, 1],
            opacity: [1, 1, 1, 1, 1, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0, 0, 0, 1],
            filter: ["blur(0px)", "blur(0px)", "blur(0px)", "blur(0px)", "blur(0px)", "blur(4px)", "blur(4px)", "blur(4px)", "blur(4px)", "blur(4px)", "blur(4px)", "blur(0px)", "blur(0px)", "blur(0px)", "blur(0px)"]
          }}
          transition={{ duration: 8, repeat: Infinity, times: T }}
        >
          <motion.div 
            className="w-[30%] aspect-[9/16] bg-gradient-to-br from-[#333333]/10 to-[#333333]/5 rounded-lg border-[2px] flex items-center justify-center relative overflow-hidden shadow-sm"
            animate={{
              borderColor: ["transparent", "transparent", "#333333", "#333333", "#333333", "#333333", "#333333", "#333333", "#333333", "#333333", "#333333", "transparent", "transparent", "transparent", "transparent"]
            }}
            transition={{ duration: 8, repeat: Infinity, times: T }}
          >
            <VideoIcon className="w-8 h-8 text-[#333333]/40" />
            <div className="absolute bottom-2 left-2 right-2 h-2 bg-white/60 rounded"></div>
          </motion.div>

          <motion.div 
            className="bg-[#333333] text-white px-6 py-3 rounded-lg font-bold text-sm shadow-md"
            animate={{
              scale: [1, 1, 1, 1, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, times: T }}
          >
            Post to Socials
          </motion.div>
        </motion.div>

        {/* Screen 2: Calendar Modal */}
        <motion.div 
          className="absolute inset-x-4 bottom-4 top-12 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 flex flex-col items-center justify-center"
          animate={{
            y: ["120%", "120%", "120%", "120%", "120%", "0%", "0%", "0%", "0%", "0%", "0%", "120%", "120%", "120%", "120%"],
            scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0, 0, 0, 0],
            opacity: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, times: T }}
        >
          <div className="text-sm font-bold text-[#333333] mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Select Schedule Date
          </div>
          <div className="grid grid-cols-4 gap-2 mb-6 w-full max-w-[200px]">
            {[...Array(8)].map((_, i) => (
              <motion.div 
                key={i} 
                className="aspect-square rounded border flex flex-col items-center justify-center relative shadow-sm"
                animate={i === 5 ? {
                  backgroundColor: ["#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#333333", "#333333", "#333333", "#333333", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb"],
                  borderColor: ["transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "#333333", "#333333", "#333333", "#333333", "transparent", "transparent", "transparent", "transparent"],
                  color: ["#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#4b5563", "#4b5563", "#4b5563", "#4b5563"],
                } : {
                  backgroundColor: ["#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb", "#f9fafb"],
                  borderColor: ["transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent", "transparent"],
                  color: ["#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563", "#4b5563"]
                }}
                transition={{ duration: 8, repeat: Infinity, times: T }}
              >
                <span className="text-xs font-bold">{i + 12}</span>
              </motion.div>
            ))}
          </div>
          <motion.div 
            className="bg-gradient-to-r from-[#A855F7] to-[#ff6118] text-white px-8 py-2.5 rounded-lg font-bold text-sm shadow-md"
            animate={{
              scale: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 1, 1, 1, 1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, times: T }}
          >
            Confirm
          </motion.div>
        </motion.div>

        {/* Screen 3: Success Message */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white/60 backdrop-blur-[4px] z-40"
          animate={{
            scale: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.1, 1, 0],
            opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
            pointerEvents: ["none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "none", "auto", "auto", "none"]
          }}
          transition={{ duration: 8, repeat: Infinity, times: T }}
        >
          <div className="w-16 h-16 rounded-full bg-[#333333] flex items-center justify-center mb-4 shadow-xl">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <div className="w-full flex items-center justify-center">
            <p className="text-[#333333] font-extrabold text-center text-lg max-w-[250px] leading-tight px-4">
              Your video is scheduled successfully!
            </p>
          </div>
        </motion.div>

        {/* Animated Mouse Cursor */}
        <motion.div 
          className="absolute z-[999] pointer-events-none drop-shadow-2xl"
          style={{ width: 32, height: 32, marginTop: -2, marginLeft: -4 }}
          initial={{ left: "60%", top: "90%", scale: 1 }}
          animate={{
            left: ["60%", "30%", "30%", "70%", "70%", "70%", "48%", "48%", "50%", "50%", "50%", "80%", "80%", "80%", "60%"],
            top: ["90%", "50%", "50%", "50%", "50%", "50%", "45%", "45%", "85%", "85%", "85%", "90%", "90%", "90%", "90%"],
            scale: [1, 1, 0.8, 1, 0.8, 1, 1, 0.8, 1, 0.8, 1, 1, 1, 1, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            times: T
          }}
        >
          <MousePointer2 className="w-8 h-8 text-[#333333] fill-[#333333]" />
        </motion.div>

      </div>
    </div>
  );
};

export function ScheduleAndPost() {
  return (
    <section className="pt-24 pb-24 bg-transparent px-4 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-[32px] md:text-[54px] font-[300] text-brand-secondary tracking-[-0.26px] leading-[1.05] mb-5 text-balance">
            Schedule and Post
          </h2>
          <p className="text-[16px] md:text-[18px] text-brand-on-surface-variant leading-[26px] font-[300]">
            Consistency is key to reaching 1 million views. Use twenty2short's Schedule and Post features to publish the clips to TikTok, YouTube, and Instagram over multiple days.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          {/* Feature 1 */}
          <div className="flex flex-col">
            <h3 className="text-[24px] font-bold text-brand-secondary mb-3 tracking-tight">
              Schedule and Post to multiple platforms at once
            </h3>
            <p className="text-brand-on-surface-variant leading-[26px] text-[16px] font-[300] mb-6">
              With twenty2short's Calendar Feature, you can schedule and post to TikTok, YouTube, and Instagram at best performing times, saving you time and effort. Just set multiple posts and forget about it.
            </p>
            <ScheduleAnimation />
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col">
            <h3 className="text-[24px] font-bold text-brand-secondary mb-3 tracking-tight">
              Automated Titles, Descriptions & Hashtags
            </h3>
            <p className="text-brand-on-surface-variant leading-[26px] text-[16px] font-[300] mb-6">
              Create optimized titles, descriptions and hashtags to improve visibility and engagement.
            </p>
            <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-brand-surface flex items-center justify-center p-6 group">
              <AnimatedSEOCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
