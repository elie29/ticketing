import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '../styles/globals.css';
import buildClient from '../api/build-client';
import Header from '../components/header';
import { ErrorNotice } from '../components/ui';

const AppComponent = ({ Component, pageProps, currentUser, sessionError }) => {
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only z-50 bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <Header currentUser={currentUser} />
      <main id="main" className="page-enter mx-auto w-full max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        {sessionError && <div className="mb-6"><ErrorNotice errors={[{ message: 'The account service is unavailable. Please try again shortly.' }]} /></div>}
        <Component {...pageProps} currentUser={currentUser} />
      </main>
    </div>
  );
};

AppComponent.getInitialProps = async appContext => {
  const client = buildClient(appContext.ctx);
  let currentUser = null;
  let sessionError = false;
  try {
    const response = await client('/api/users/currentuser', { signal: AbortSignal.timeout(5000) });
    if (!response.ok && response.status !== 401) throw new Error('Current user request failed');
    if (response.ok) currentUser = (await response.json()).currentUser;
  } catch {
    sessionError = true;
  }

  let pageProps = {};
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps({ ...appContext.ctx, currentUser, sessionError });
  }

  return {
    pageProps,
    currentUser,
    sessionError
  };
};

export default AppComponent;
