import './createPost.js';

import { Devvit, useState, useInterval } from '@devvit/public-api';

// Defines the messages that are exchanged between Devvit and Web View
type WebViewMessage =
  | {
      type: 'action';
      data: { gameWon: boolean, reset: boolean };
    }

Devvit.configure({
  redditAPI: true,
  redis: true,
});

var Draggabl

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
    const [webviewVisible, setWebviewVisible] = useState(false);
    const [timer, setTimer] = useState(0);
    const [gameWon, setGameWon] = useState(false);

    const updateInterval = useInterval(() => {
      setTimer((timer) => timer + 1);
    }, 1000);

    const stopTimer = () => {
      updateInterval.stop();
    };

    // When the web view invokes `window.parent.postMessage` this function is called
    const onMessage = async (msg: WebViewMessage) => {
      switch (msg.type) {
        case 'action':
          if(msg.data.gameWon) {
            setGameWon(true)
            updateInterval.stop();
          }

          if(msg.data.reset) {
            setTimer((timer) => timer- timer);
          }
          break;

        default:
          throw new Error(`Unknown message type: ${msg}`);
      }
    };

    // When the button is clicked, send initial data to web view and show it
    const onShowWebviewClick = () => {
      setWebviewVisible(true);
      updateInterval.start();
      context.ui.webView.postMessage('myWebView', {
        type: 'initialData',
        data: {
          username: username,
        },
      });
    };

    // Render the custom post type
    return (
      <vstack grow padding="small">
        
        <vstack
          grow={true}
          height={'20%'}
          // alignment="start top"
        >
          <hstack alignment="middle">
            <text size="xxlarge" weight="bold" alignment="middle" >
              Solvet Jigsaw
            </text>
            <spacer grow={true}></spacer>
            <text size="large" alignment="end">User:  </text>
            <text size="large" weight="bold" alignment="end">
              {' '}
              {username ?? ''}
            </text>
          </hstack>
          <spacer />
          <spacer></spacer>
          <hstack alignment="end">
            <button onPress={onShowWebviewClick}>Start</button>
            <spacer></spacer>
            <spacer></spacer>
            <button onPress={stopTimer}>Stop</button>
            <spacer grow={true}></spacer>
            <text size="large"> {gameWon ? 'WON 🎉' : ''} </text>
            <spacer grow={true}></spacer>
            <text alignment="middle" size="large">Timer: </text>
            <text size="large" weight="bold" alignment="end">
              {timer ? `${timer}s` : '0s'}
            </text>
          </hstack>
          <spacer></spacer>
        </vstack>

        

        <vstack grow={webviewVisible} height={webviewVisible ? '100%' : '0%'}>
          <vstack border="thick" borderColor="black" height={webviewVisible ? '100%' : '0%'}>
            <webview
              id="myWebView"
              url="page.html"
              onMessage={(msg) => onMessage(msg as WebViewMessage)}
              grow
              height={webviewVisible ? '100%' : '0%'}
            />
          </vstack>
        </vstack>
      </vstack>
    );
  },
});

export default Devvit;
