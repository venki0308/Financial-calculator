package com.fincalix.app;

import android.os.Bundle;
import android.view.ActionMode;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    // ── CURSOR / "SELECT ALL" FIX ───────────────────────────────────────
    @Override
    public void onActionModeStarted(ActionMode mode) {
        mode.finish();
    }

    @Override
    public void onActionModeFinished(ActionMode mode) {
        super.onActionModeFinished(mode);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.clearFocus();
            }
        }
    }
}