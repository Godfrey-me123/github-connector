import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useTemplateStore } from './store/useTemplateStore';
import { UploadScreen } from './components/UploadScreen';
import { TemplatesScreen } from './components/TemplatesScreen';
import { Toolbar } from './components/Toolbar';
import { LeftPanel } from './components/LeftPanel';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { RightPanel } from './components/RightPanel';
import { BottomStatusBar } from './components/BottomStatusBar';
import { TemplateLibraryModal } from './components/TemplateLibraryModal';
import { CardGeneratorModal } from './components/CardGeneratorModal';
import { ExportModal } from './components/ExportModal';
import { SaveTemplateModal } from './components/SaveTemplateModal';
import { MergeCardModal } from './components/MergeCardModal';
import { MobileNavBar } from './components/MobileNavBar';
import { MobileBottomSheet } from './components/MobileBottomSheet';
import { NidaFormScreen } from './components/nida';
import { NidaRequestFormScreen } from './components/nida/NidaRequestFormScreen';
import { DrivingLicenseFormScreen } from './components/nida/DrivingLicenseFormScreen';
import { NhifFormScreen } from './components/nida/NhifFormScreen';
import { NidaSuccessToast } from './components/nida/NidaSuccessToast';
import { HomeScreen } from './components/HomeScreen';
import { CardPreviewScreen } from './components/CardPreviewScreen';
import { PasskeyScreen } from './components/auth/PasskeyScreen';
import { PasskeyManagerModal } from './components/auth/PasskeyManagerModal';
import { ManualApplicationModal } from './components/auth/ManualApplicationModal';
import { RechargeModal } from './components/auth/RechargeModal';
import { UsageExhaustedBanner } from './components/auth/UsageExhaustedBanner';
import { DownloadsScreen } from './components/DownloadsScreen';
import { TokenBillingScreen } from './components/billing/TokenBillingScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { PaymentDashboard } from './components/admin/PaymentDashboard';
import { UnsavedChangesModal } from './components/common/UnsavedChangesModal';
import { StartupDisclaimerModal } from './components/common/StartupDisclaimerModal';
import { SuccessActivationModal } from './components/common/SuccessActivationModal';

export default function App() {
  const { activeScreen, setActiveScreen, authRole, fetchPasskeysFromSupabase, userPreferences, loadSavedTemplates, isSaving, loadTokenPackages, loadWeeklyOffers } = useTemplateStore();

  useEffect(() => {
    fetchPasskeysFromSupabase();
    loadSavedTemplates();
    loadTokenPackages();
    loadWeeklyOffers();

    let unsubPkgs: (() => void) | null = null;
    let unsubOffers: (() => void) | null = null;

    import('./services/supabase').then(({ subscribeTokenPackagesRealtime, subscribeWeeklyOffersRealtime }) => {
      unsubPkgs = subscribeTokenPackagesRealtime((freshPkgs) => {
        console.log('Realtime update: token packages received', freshPkgs);
        if (freshPkgs && Array.isArray(freshPkgs)) {
          const mapped = freshPkgs.map((p) => ({
            id: p.id,
            name: p.name,
            usages: p.usages,
            price: p.price,
            description: p.description || '',
            visibility: (p.visibility || 'public') as 'public' | 'hidden',
            active: p.is_active !== false,
            sortOrder: p.sort_order ?? 0,
            bonus: p.bonus ?? 0,
            promotion: p.promotion || '',
          }));
          useTemplateStore.setState({ tokenPackages: mapped });
        }
      });

      unsubOffers = subscribeWeeklyOffersRealtime((freshOffers) => {
        if (freshOffers && Array.isArray(freshOffers)) {
          const mapped = freshOffers.map((o) => ({
            id: o.id,
            title: o.title,
            description: o.description || '',
            tokens: o.tokens,
            price: o.price,
            services: o.services || [],
            startDate: o.start_date,
            endDate: o.end_date,
            active: o.is_active !== false,
          }));
          useTemplateStore.setState({ weeklyOffers: mapped });
        }
      });
    }).catch(() => {});

    let templatesChannel: any = null;
    let templatesClient: any = null;
    import('./services/supabase').then(({ supabase }) => {
      if (!supabase) return;
      templatesClient = supabase;
      templatesChannel = supabase
        .channel('realtime_templates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => {
          loadSavedTemplates();
        })
        .subscribe();
    }).catch(() => {});

    const refreshFromCloud = () => {
      if (document.visibilityState === 'visible') {
        loadSavedTemplates();
        loadTokenPackages();
      }
    };
    document.addEventListener('visibilitychange', refreshFromCloud);

    return () => {
      if (unsubPkgs) unsubPkgs();
      if (unsubOffers) unsubOffers();
      if (templatesClient && templatesChannel) templatesClient.removeChannel(templatesChannel);
      document.removeEventListener('visibilitychange', refreshFromCloud);
    };
  }, [fetchPasskeysFromSupabase, loadSavedTemplates, loadTokenPackages, loadWeeklyOffers]);

  // Guard Custom Studio access for non-admin users
  useEffect(() => {
    if (authRole !== 'admin' && (activeScreen === 'upload' || activeScreen === 'templates' || activeScreen === 'editor')) {
      setActiveScreen('home');
    }
  }, [authRole, activeScreen, setActiveScreen]);

  // Native Android APK JS Bridges
  useEffect(() => {
    // 1. Android Native SMS Receiver Callback
    const handleNativeSms = async (sender: string, rawSms: string, timestamp?: string | number) => {
      const { receiveNativeSms } = await import('./services/smsReceiver');
      const result = await receiveNativeSms(sender, rawSms, timestamp);
      if (result.ok) {
        fetchPasskeysFromSupabase();
      }
      return result.ok;
    };
    // Register under every name the Android wrapper may call, so a mismatch
    // in the native layer can never silently drop incoming payment SMS.
    (window as any).onNativeSmsReceived = handleNativeSms;
    (window as any).onSmsReceived = handleNativeSms;
    (window as any).receiveSms = handleNativeSms;
    (window as any).BIGstaOnSms = handleNativeSms;

    import('./services/smsReceiver').then(({ markReceiverRegistered, flushSmsOutbox }) => {
      markReceiverRegistered();
      flushSmsOutbox();
    }).catch(() => {});

    const retryOutbox = () => {
      import('./services/smsReceiver').then(({ flushSmsOutbox }) => flushSmsOutbox()).catch(() => {});
    };
    window.addEventListener('online', retryOutbox);
    // Periodic retry so a queued SMS is never stranded if the device never
    // fires an 'online' event (common inside Android WebViews).
    const outboxTimer = setInterval(retryOutbox, 60000);

    // 2. Request Permissions Bridge
    (window as any).requestApkPermissions = () => {
      const android = (window as any).AndroidInterface || (window as any).Android || (window as any).JSInterface;
      if (android && typeof android.requestPermissions === 'function') {
        android.requestPermissions();
        return true;
      }
      console.warn('[Native APK Bridge] No Java/Kotlin interface found. Run inside APK with standard WebAppInterface bindings.');
      return false;
    };

    // 3. Native Storage Save Bridge
    (window as any).saveFileNatively = (fileName: string, base64Data: string) => {
      const android = (window as any).AndroidInterface || (window as any).Android || (window as any).JSInterface;
      if (android && typeof android.saveFile === 'function') {
        android.saveFile(fileName, base64Data);
        return true;
      }
      return false;
    };

    return () => {
      window.removeEventListener('online', retryOutbox);
      clearInterval(outboxTimer);
    };
  }, [fetchPasskeysFromSupabase]);

  // Automatically trigger Native Permissions request if inside the APK Webview environment on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      const android = (window as any).AndroidInterface || (window as any).Android || (window as any).JSInterface;
      if (android) {
        console.log('[Native APK Bridge] Native wrapper detected. Launching automated permission trigger...');
        if (typeof android.requestPermissions === 'function') {
          android.requestPermissions();
        }
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Synchronize system and user theme with DOM
  useEffect(() => {
    const isDark = userPreferences?.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
    }
  }, [userPreferences?.theme]);

  // PASSKEY GATEWAY SYSTEM: Must enter valid passkey first
  if (!authRole) {
    // Redirect all restricted paths to login
    const path = window.location.pathname;
    if (path !== '/' && path !== '/login') {
      window.history.replaceState({}, '', '/login');
    }
    return (
      <>
        <PasskeyScreen />
        <StartupDisclaimerModal />
      </>
    );
  }

  // Strict RBAC Guard: Regular Users (authRole === 'user') are blocked from Studio/Editor/Templates
  if (authRole === 'user' && (activeScreen === 'editor' || activeScreen === 'templates' || activeScreen === 'upload')) {
    return (
      <>
        <UsageExhaustedBanner />
        <HomeScreen />
        <PasskeyManagerModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'downloads') {
    return (
      <>
        <UsageExhaustedBanner />
        <DownloadsScreen />
        <PasskeyManagerModal />
        <RechargeModal />
      </>
    );
  }

  if (activeScreen === 'billing') {
    return (
      <>
        <UsageExhaustedBanner />
        <TokenBillingScreen />
        <PasskeyManagerModal />
        <RechargeModal />
      </>
    );
  }

  if (activeScreen === 'settings') {
    return (
      <>
        <UsageExhaustedBanner />
        <SettingsScreen />
        <PasskeyManagerModal />
        <RechargeModal />
      </>
    );
  }

  if (activeScreen === 'home') {
    return (
      <>
        <UsageExhaustedBanner />
        <HomeScreen />
        <PasskeyManagerModal />
        <ManualApplicationModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'upload') {
    return (
      <>
        <UsageExhaustedBanner />
        <UploadScreen />
        <PasskeyManagerModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'templates') {
    return (
      <>
        <UsageExhaustedBanner />
        <TemplatesScreen />
        <PasskeyManagerModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'nida_request') {
    return (
      <>
        <UsageExhaustedBanner />
        <NidaRequestFormScreen />
        <PasskeyManagerModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'nida') {
    return (
      <>
        <UsageExhaustedBanner />
        <NidaFormScreen
          onCancel={() => useTemplateStore.getState().goBack()}
          onSuccess={() => {
            // Handled in workflow -> transitions to preview screen
          }}
        />
        <PasskeyManagerModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'driving_license') {
    return (
      <>
        <UsageExhaustedBanner />
        <DrivingLicenseFormScreen
          onCancel={() => useTemplateStore.getState().goBack()}
          onSuccess={() => {
            // Handled in workflow -> transitions to preview screen
          }}
        />
        <PasskeyManagerModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'nhif') {
    return (
      <>
        <UsageExhaustedBanner />
        <NhifFormScreen
          onCancel={() => useTemplateStore.getState().goBack()}
          onSuccess={() => {
            // Handled in workflow -> transitions to preview screen
          }}
        />
        <PasskeyManagerModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'preview') {
    return (
      <>
        <UsageExhaustedBanner />
        <CardPreviewScreen />
        <PasskeyManagerModal />
        <RechargeModal />
        <ExportModal />
        <SaveTemplateModal />
        <MergeCardModal />
        <TemplateLibraryModal />
        <CardGeneratorModal />
      </>
    );
  }

  if (activeScreen === 'admin-payments' && authRole === 'admin') {
    return (
      <>
        <UsageExhaustedBanner />
        <PaymentDashboard />
        <PasskeyManagerModal />
        <RechargeModal />
      </>
    );
  }

  // Final Guard for Users: If they reach this point (unknown screen or editor), send back to home
  if (authRole === 'user') {
    return (
      <>
        <UsageExhaustedBanner />
        <HomeScreen />
        <RechargeModal />
      </>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#FFFFFF] text-[#000000] overflow-hidden font-sans">
      {/* Usage Exhaustion Auto-Logout Banner */}
      <UsageExhaustedBanner />

      {/* NIDA Success Notification Toast */}
      <NidaSuccessToast />

      {/* Top Toolbar */}
      <Toolbar />

      {/* Main Editor Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative pb-14 lg:pb-0">
        <LeftPanel />
        <CanvasWorkspace />
        <RightPanel />
      </div>

      {/* Mobile Canva-style Dock (Visible only on mobile editor) */}
      {activeScreen === 'editor' && <MobileNavBar />}

      {/* Mobile Slide-Up Drawer for Elements, Layers, Backgrounds, Properties */}
      {activeScreen === 'editor' && <MobileBottomSheet />}

      {/* Bottom Status Bar (Desktop) */}
      <BottomStatusBar />

      {/* Modals & Passkey Manager */}
      <SuccessActivationModal />
      <UnsavedChangesModal />
      <PasskeyManagerModal />
      <ManualApplicationModal />
      <RechargeModal />
      <TemplateLibraryModal />
      <CardGeneratorModal />
      <ExportModal />
      <SaveTemplateModal />
      <MergeCardModal />

      {/* Global Saving Indicator (PROMPT 51) */}
      {isSaving && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[4px]">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300 max-w-xs w-full">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#000000] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-base font-black text-[#000000]">Saving Changes...</span>
              <p className="text-[11px] text-slate-500 mt-1 font-medium px-2">
                Updating your account preferences and syncing with the central cloud store.
              </p>
            </div>
            
            <button
              onClick={() => useTemplateStore.setState({ isSaving: false })}
              className="mt-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 active:scale-95"
            >
              Cancel Saving
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
