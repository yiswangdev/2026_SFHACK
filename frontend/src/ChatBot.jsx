import { useEffect, useRef } from "react";

export default function ChatBot({ selectedPlace, loading }) {
  const scrollRef = useRef(null);
  const scrollEndRef = useRef(null);

  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedPlace, loading]);

  return (
    <div className="chatbotCard">
      <div className="cardHeader">
        <h2>AI Summary</h2>
        <p>Powered by Gemini • Select a store to get insights</p>
      </div>

      <div className="chatContent" ref={scrollRef}>
        {!selectedPlace ? (
          <div className="chatFallback">
            👋 Click on a thrift store from the results to get an AI-powered summary
          </div>
        ) : (
          <>
            {selectedPlace.storeName && (
              <div className="messageGroup">
                <div className="messageLabel">Store:</div>
                <div className="messageBubble system">
                  {selectedPlace.storeName}
                </div>
              </div>
            )}

            {selectedPlace.summary ? (
              <div className="messageGroup">
                <div className="messageLabel">Summary:</div>
                <div className="messageBubble">
                  {selectedPlace.summary}
                </div>
              </div>
            ) : loading ? (
              <div className="messageGroup">
                <div className="messageBubble loading">
                  <span className="dots">⏳ Generating summary...</span>
                </div>
              </div>
            ) : selectedPlace.error ? (
              <div className="messageGroup">
                <div className="messageBubble error">
                  ⚠️ Error: {selectedPlace.error}
                </div>
              </div>
            ) : (
              <div className="messageGroup">
                <div className="messageBubble error">
                  Could not load summary. Please try another store.
                </div>
              </div>
            )}
          </>
        )}
        <div ref={scrollEndRef} />
      </div>

      <div className="chatFooter">
        <span className="chatHint">
          {selectedPlace ? "Switch stores or search again to update" : "Ready to explore"}
        </span>
      </div>
    </div>
  );
}
