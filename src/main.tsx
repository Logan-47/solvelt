import './createPost.js';

import { Devvit, useState, useInterval } from '@devvit/public-api';

// Defines the messages that are exchanged between Devvit and Web View
type WebViewMessage =
  | {
      type: 'action';
      data: { gameWon: boolean, reset: boolean, started: boolean };
    }

Devvit.configure({
  redditAPI: true,
  redis: true,
});


// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: 'Solvelt',
  height: 'tall',
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      const currUser = await context.reddit.getCurrentUser();
      return currUser?.username ?? 'anon';
    });
;
    // Create a reactive state for web view visibility
    const [webviewVisible, setWebviewVisible] = useState(true);
    const [timer, setTimer] = useState(0);
    const [gameState, setGameState] = useState("not_started");
    const [isPaused, setIsPaused] = useState(false);

    const updateInterval = useInterval(() => {
      setTimer((timer) => (timer + 1));
    }, 1000);


    // When the web view invokes `window.parent.postMessage` this function is called
    const onMessage = async (msg: WebViewMessage) => {
      switch (msg.type) {
        case 'action':
          if(msg.data.gameWon) {
            setGameState("won")
            updateInterval.stop();
          }

          if(msg.data.reset) {
            setTimer((timer) => timer- timer);
          }

          if(msg.data.started) {
            setGameState("started")
          }
          break;

        default:
          throw new Error(`Unknown message type: ${msg}`);
      }
    };

    // When the button is clicked, send initial data to web view and show it
    const onStateClick = () => {
      // setWebviewVisible(true);
      setGameState("started")
      updateInterval.start();
      context.ui.webView.postMessage('myWebView', {
        type: 'game-state',
        data: {
          gameState: "started",
        },
      });
    };

    const resetGame = () => {
      setGameState("not_started")
      updateInterval.stop();
      setTimer((timer) => timer- timer);
      context.ui.webView.postMessage('myWebView', {
        type: 'game-state',
        data: {
          reset: true,
        },
      });
    }

    const stopTimer = () => {
      if(isPaused){
        updateInterval.start();
        setIsPaused(false);
        context.ui.webView.postMessage('myWebView', {
          type: 'game-state',
          data: {
            isPaused: false,
          },
        });
      } else {
        updateInterval.stop();
        setIsPaused(true);
        context.ui.webView.postMessage('myWebView', {
          type: 'game-state',
          data: {
            isPaused: true,
          },
        });
      }
        
      
    };


    // Render the custom post type
    return (
      <vstack grow padding="small">
        
        <vstack
          grow={true}
          height={'20%'}
          // alignment="start top"
        >
          <hstack alignment="center" width='100%'>
            <spacer grow={true}></spacer>
            <text size="large">User:  </text>
            <text size="large" weight="bold" alignment="end">
              {' '}
              {username ?? ''}
            </text>
          </hstack>
          <spacer></spacer>
          <spacer></spacer>
          <hstack alignment='center'>
              <text  size="xlarge" weight='bold'> {gameState === "not_started" ? 'Hit Start to Begin 🚀' : ''} </text>
              <text  size="xlarge" weight='bold'> {gameState === "started" ? 'Start arranging 🧩' : ''} </text>
              <text size="xlarge" weight='bold'> {gameState === "won" ? 'Amazing you won! 🎉 ' : ''} </text>
          </hstack>
          <spacer />
        </vstack>
      
        <vstack grow={webviewVisible} height={webviewVisible ? '100%' : '0%'}>
          <vstack height={webviewVisible ? '100%' : '0%'}>
            <webview
              id="myWebView"
              url="page.html"
              onMessage={(msg) => onMessage(msg as WebViewMessage)}
              grow
              height={webviewVisible ? '100%' : '0%'}
            />
          </vstack>
        </vstack>

        <spacer></spacer>

        <hstack alignment="end">
            <text alignment="bottom center" size="large">{gameState === 'won' ? 'Total Time Taken: ': 'Timer: '} </text>
            <text size="large" weight="bold" alignment="bottom">
              {timer ? `${Math.floor(timer/60)}m:${timer%60}s` : '0m:0s'}
            </text>
            <spacer grow={true}></spacer>
            <spacer grow={true}></spacer>
            <button onPress={onStateClick}  appearance='success' disabled={gameState != 'not_started'}>{gameState === 'won' ? 'restart': 'start'}</button>
            <spacer></spacer>
            <spacer></spacer>
            <button onPress={stopTimer} disabled={(gameState === 'not_started' || gameState === 'won')} appearance={isPaused ? 'media': 'caution'}>{isPaused ? 'resume': 'pause'}</button>
            <spacer></spacer>
            <spacer></spacer>
            <button onPress={resetGame}  disabled={gameState != 'started'} appearance='primary'>reset</button>
            <spacer grow={true}></spacer>
            <spacer grow={true}></spacer>
            
            <spacer></spacer>
            <spacer></spacer>
          </hstack>

      </vstack>
    );
  },
});

export default Devvit;
