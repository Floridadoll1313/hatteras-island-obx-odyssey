import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Anchor, Waves, Compass, Heart, ArrowLeft, Hammer, Map, Info, Send, User, Trash2, MessageSquare } from 'lucide-react';
import { db, auth, signIn } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface Comment {
  id: string;
  authorName: string;
  authorUid: string;
  text: string;
  timestamp: any;
}

const Memorial = ({ onBack }: { onBack: () => void }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 1000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'comments'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await signIn();
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        authorName: user.displayName || 'Anonymous',
        authorUid: user.uid,
        text: newComment.trim(),
        timestamp: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to remove this comment?')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] selection:bg-[#00E0FF]/20 font-sans relative overflow-x-hidden">
      {/* Atmospheric Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00E0FF]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00E0FF]/3 blur-[150px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-white/2 blur-[100px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-8 flex justify-between items-center bg-gradient-to-b from-[#050505] to-transparent">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-3 text-white/40 hover:text-[#00E0FF] transition-all group"
        >
          <div className="p-2 rounded-full border border-white/10 group-hover:border-[#00E0FF]/40 transition-colors">
            <ArrowLeft size={16} />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Return to Island</span>
        </motion.button>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
            <span>Salvo</span>
            <span className="w-1 h-1 bg-white/10 rounded-full" />
            <span>North Carolina</span>
          </div>
          <Anchor size={20} className="text-[#00E0FF]/40" />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: 60 }}
                className="h-px bg-[#00E0FF]/40"
              />
              <span className="block text-[11px] font-mono text-[#00E0FF] uppercase tracking-[0.5em]">In Loving Memory</span>
            </div>

            <h1 className="text-7xl md:text-9xl font-serif font-light tracking-tighter leading-[0.85] text-white">
              Johnny <br />
              <span className="italic text-[#00E0FF]">Bull</span> <br />
              Hooper
            </h1>

            <div className="flex flex-wrap items-center gap-8 pt-4">
              <div className="space-y-1">
                <span className="block text-[9px] font-mono text-white/20 uppercase tracking-widest">Born</span>
                <span className="text-xl font-serif italic text-white/80">Feb 19, 1968</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="space-y-1">
                <span className="block text-[9px] font-mono text-white/20 uppercase tracking-widest">Departed</span>
                <span className="text-xl font-serif italic text-white/80">Dec 8, 2022</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="space-y-1">
                <span className="block text-[9px] font-mono text-white/20 uppercase tracking-widest">Location</span>
                <span className="text-xl font-serif italic text-white/80">Salvo, NC</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div 
              onClick={addRipple}
              className="aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 relative group cursor-pointer"
            >
              <img 
                src="https://picsum.photos/seed/bull-portrait/800/1000" 
                alt="Johnny Bull Hooper" 
                className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60" />
              
              {/* Decorative Frame */}
              <div className="absolute inset-4 border border-white/5 rounded-[1.5rem] pointer-events-none" />

              {/* Ripple Effect */}
              <AnimatePresence>
                {ripples.map(ripple => (
                  <motion.div
                    key={ripple.id}
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute bg-white/20 rounded-full pointer-events-none"
                    style={{
                      width: '100px',
                      height: '100px',
                      left: ripple.x - 50,
                      top: ripple.y - 50,
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
            
            {/* Floating Badge */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -right-6 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hidden md:block"
            >
              <Hammer size={32} className="text-[#00E0FF] mb-4" />
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Mastery</div>
              <div className="text-lg font-serif italic text-white">Master Carpenter</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden">
          <div className="p-12 bg-[#050505] flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-[#00E0FF]/5 border border-[#00E0FF]/10">
              <Hammer size={24} className="text-[#00E0FF]" />
            </div>
            <div className="space-y-1">
              <span className="block text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">The Craft</span>
              <h3 className="text-2xl font-serif text-white">Master Carpenter</h3>
            </div>
          </div>
          
          <div className="p-12 bg-[#050505] flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-[#00E0FF]/5 border border-[#00E0FF]/10">
              <Map size={24} className="text-[#00E0FF]" />
            </div>
            <div className="space-y-1">
              <span className="block text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">The Legacy</span>
              <h3 className="text-2xl font-serif text-white">Island Knowledge</h3>
            </div>
          </div>

          <div className="p-12 bg-[#050505] flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-[#00E0FF]/5 border border-[#00E0FF]/10">
              <Heart size={24} className="text-[#00E0FF]" />
            </div>
            <div className="space-y-1">
              <span className="block text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">The Journey</span>
              <h3 className="text-2xl font-serif text-white">53 Years</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-20 space-y-32">
        {/* Story Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="space-y-12"
        >
          <div className="relative">
            <div className="absolute -left-12 top-0 text-9xl font-serif text-[#00E0FF]/5 pointer-events-none">"</div>
            <h2 className="text-4xl md:text-6xl font-serif text-white leading-tight">
              The heartbeat of Salvo, a man whose hands built the <span className="italic text-[#00E0FF]">foundation</span> of our community.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8 text-xl font-serif font-light text-white/60 leading-relaxed italic">
              <p>
                Johnny Bull Hooper was more than a resident of the Outer Banks; he was an essential part of its structural and spiritual integrity. 
                As a master carpenter, his legacy is literally built into the homes that stand against the Atlantic's fury.
              </p>
              <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 italic text-[#00E0FF]/80 border-l-2 border-[#00E0FF]/30">
                "He knew everything about that Island. He was a Carpenter by trade and knew everything no matter what the issue."
              </div>
            </div>

            <div className="space-y-8 text-lg font-light text-white/50 leading-relaxed">
              <p>
                There was no mystery of the coast too deep for Bull. From the complex structural needs of a Salvo cottage to the unspoken rhythms of the Atlantic tides, 
                his understanding was innate. It was a knowledge etched into his spirit by decades of salt air and the relentless cadence of the waves.
              </p>
              <p>
                To know Bull was to know the island. He carried its history in his hands and its future in his craftsmanship. 
                His departure leaves a void in the village of Salvo that only the sea can echo.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Gallery Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">Visual Legacy</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
              whileHover={{ y: -10 }}
              className="aspect-square rounded-[2.5rem] overflow-hidden border border-white/10 relative group"
            >
              <img 
                src="https://picsum.photos/seed/bull-working/800/800" 
                alt="Johnny Bull Hooper at work" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-8 left-8 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                <span className="text-[10px] font-mono text-[#00E0FF] uppercase tracking-widest">The Craftsman</span>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -10 }}
              className="aspect-square rounded-[2.5rem] overflow-hidden border border-white/10 relative group"
            >
              <img 
                src="https://picsum.photos/seed/bull-pier/800/800" 
                alt="Johnny Bull Hooper at the pier" 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-8 left-8 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                <span className="text-[10px] font-mono text-[#00E0FF] uppercase tracking-widest">The Islander</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Video Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">Island Atmosphere</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/20 aspect-video relative group">
            <video 
              src="/input_file_0.mp4" 
              controls 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
              poster="https://picsum.photos/seed/obx-video/1280/720?blur=2"
            />
          </div>
        </div>

        {/* Respects Section */}
        <div className="space-y-12 pt-20 border-t border-white/5">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-[#00E0FF]/5 border border-[#00E0FF]/10 mb-4">
              <MessageSquare size={24} className="text-[#00E0FF]" />
            </div>
            <h2 className="text-4xl font-serif text-white">Pay Your Respects</h2>
            <p className="text-white/40 font-light max-w-md mx-auto">Share a memory, a thought, or a final word for the Spirit of Salvo.</p>
          </div>

          <div className="max-w-2xl mx-auto space-y-12">
            <form onSubmit={handleSubmitComment} className="space-y-6">
              <div className="relative group">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={user ? "Share a memory..." : "Sign in to leave a message..."}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-lg font-serif italic focus:outline-none focus:border-[#00E0FF]/40 focus:bg-white/[0.04] transition-all min-h-[160px] resize-none"
                  disabled={isSubmitting}
                />
                {!user && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/60 backdrop-blur-[4px] rounded-3xl">
                    <button
                      type="button"
                      onClick={signIn}
                      className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-[#00E0FF] transition-all flex items-center gap-3 shadow-2xl"
                    >
                      <User size={20} />
                      Sign in with Google
                    </button>
                  </div>
                )}
              </div>
              
              {user && (
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#00E0FF]/10 flex items-center justify-center text-[#00E0FF]">
                      <User size={16} />
                    </div>
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{user.displayName}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="px-8 py-4 bg-[#00E0FF]/10 border border-[#00E0FF]/30 text-[#00E0FF] font-bold rounded-2xl hover:bg-[#00E0FF]/20 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Message'}
                    <Send size={18} />
                  </button>
                </div>
              )}
            </form>

            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 group relative hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#00E0FF]/5 border border-[#00E0FF]/10 flex items-center justify-center text-[#00E0FF]">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold tracking-tight">{comment.authorName}</p>
                          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
                            {comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                          </p>
                        </div>
                      </div>
                      {user && user.uid === comment.authorUid && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-2 text-white/5 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <p className="text-xl font-serif italic text-white/70 leading-relaxed">
                      "{comment.text}"
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {comments.length === 0 && (
                <div className="text-center py-20 border border-dashed border-white/5 rounded-[2rem]">
                  <p className="text-[10px] font-mono text-white/10 uppercase tracking-[0.5em]">No messages yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Final Quote */}
        <div className="text-center space-y-8 pt-20">
          <div className="w-px h-20 bg-gradient-to-b from-[#00E0FF]/40 to-transparent mx-auto" />
          <p className="text-4xl md:text-6xl font-serif italic text-white/20">
            Fair winds and following seas, Bull.
          </p>
          <div className="flex justify-center gap-8 pt-8">
            <Anchor size={24} className="text-white/10" />
            <Waves size={24} className="text-white/10" />
            <Compass size={24} className="text-white/10" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 text-center relative z-10">
        <p className="text-[10px] font-mono text-white/10 uppercase tracking-[0.5em]">
          Hatteras Island Legacy &copy; 2026
        </p>
      </footer>
    </div>
  );
};

export default Memorial;
