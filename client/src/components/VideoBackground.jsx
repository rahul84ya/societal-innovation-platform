export default function VideoBackground() {
  return (
    <div className="video-background fixed inset-0 z-[-1] overflow-hidden bg-black">
      {/* YouTube Embed for video: https://www.youtube.com/watch?v=82U8uXMYGYA */}
      <iframe
        src="https://www.youtube.com/embed/82U8uXMYGYA?autoplay=1&mute=1&loop=1&playlist=82U8uXMYGYA&start=76&controls=0&showinfo=0&rel=0"
        title="Background Video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        className="w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40"
      ></iframe>
      <div className="absolute inset-0 bg-gradient-to-b from-navy-blue/80 to-black/80 mix-blend-overlay"></div>
    </div>
  );
}
