package com.chiranth7.vaultx.qrscanner

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.zxing.BarcodeFormat
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.NotFoundException
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class QrScannerActivity : AppCompatActivity() {
  private lateinit var previewView: PreviewView
  private lateinit var torchBtn: TextView
  private val analysisExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private val found = AtomicBoolean(false)
  private var camera: Camera? = null
  private var torchEnabled = false

  private val qrReader = QRCodeReader()
  private val decodeHints: Map<DecodeHintType, Any> = mapOf(
    DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE),
    DecodeHintType.TRY_HARDER to true
  )

  private val requestPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      if (granted) {
        startCamera()
      } else {
        finishWithError("CAMERA_PERMISSION_DENIED")
      }
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (intent.getBooleanExtra(EXTRA_FLAG_SECURE, true)) {
      window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.BLACK)
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      )
    }

    previewView = PreviewView(this).apply {
      implementationMode = PreviewView.ImplementationMode.COMPATIBLE
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    }
    root.addView(previewView)

    val overlay = ViewfinderOverlayView(this).apply {
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    }
    root.addView(overlay)

    val topBar = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      val padH = dp(16)
      val padV = dp(12)
      setPadding(padH, padV, padH, padV)
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
        Gravity.TOP
      )
    }

    val closeBtn = TextView(this).apply {
      text = "Cancel"
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
      typeface = Typeface.DEFAULT_BOLD
      setPadding(dp(12), dp(8), dp(12), dp(8))
      setOnClickListener {
        setResult(Activity.RESULT_CANCELED)
        finish()
      }
    }

    val titleView = TextView(this).apply {
      text = "Scan 2FA QR Code"
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
    }

    torchBtn = TextView(this).apply {
      text = "Flash Off"
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
      typeface = Typeface.DEFAULT_BOLD
      setPadding(dp(12), dp(8), dp(12), dp(8))
      visibility = View.INVISIBLE
      setOnClickListener {
        val cam = camera ?: return@setOnClickListener
        if (cam.cameraInfo.hasFlashUnit()) {
          torchEnabled = !torchEnabled
          cam.cameraControl.enableTorch(torchEnabled)
          text = if (torchEnabled) "Flash On" else "Flash Off"
        }
      }
    }

    topBar.addView(closeBtn)
    topBar.addView(titleView)
    topBar.addView(torchBtn)
    root.addView(topBar)

    val hintView = TextView(this).apply {
      text = "Align the 2FA QR code inside the frame"
      setTextColor(Color.parseColor("#E5E7EB"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
      gravity = Gravity.CENTER
      setPadding(dp(24), dp(16), dp(24), dp(48))
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT,
        Gravity.BOTTOM
      )
    }
    root.addView(hintView)

    ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      topBar.setPadding(dp(16), bars.top + dp(12), dp(16), dp(12))
      hintView.setPadding(dp(24), dp(16), dp(24), bars.bottom + dp(40))
      insets
    }

    setContentView(root)

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
      startCamera()
    } else {
      requestPermissionLauncher.launch(Manifest.permission.CAMERA)
    }
  }

  private fun startCamera() {
    val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
    cameraProviderFuture.addListener({
      try {
        val cameraProvider = cameraProviderFuture.get()
        val preview = Preview.Builder().build().also {
          it.setSurfaceProvider(previewView.surfaceProvider)
        }

        val imageAnalysis = ImageAnalysis.Builder()
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .build()
          .also { analysis ->
            analysis.setAnalyzer(analysisExecutor) { imageProxy ->
              analyzeFrame(imageProxy)
            }
          }

        cameraProvider.unbindAll()
        val boundCamera = cameraProvider.bindToLifecycle(
          this,
          CameraSelector.DEFAULT_BACK_CAMERA,
          preview,
          imageAnalysis
        )
        camera = boundCamera
        if (boundCamera.cameraInfo.hasFlashUnit()) {
          torchBtn.visibility = View.VISIBLE
        }
      } catch (e: Exception) {
        finishWithError(e.message ?: "Unable to start camera.")
      }
    }, ContextCompat.getMainExecutor(this))
  }

  private fun analyzeFrame(imageProxy: ImageProxy) {
    try {
      if (found.get()) return
      val plane = imageProxy.planes.firstOrNull() ?: return
      val buffer = plane.buffer
      val remaining = buffer.remaining()
      val rowStride = plane.rowStride
      val width = imageProxy.width
      val height = imageProxy.height
      if (width <= 0 || height <= 0 || rowStride < width) return

      val bytes = ByteArray(maxOf(remaining, rowStride * height))
      buffer.get(bytes, 0, remaining)

      val source = PlanarYUVLuminanceSource(
        bytes,
        rowStride,
        height,
        0,
        0,
        width,
        height,
        false
      )

      val decoded = decodeSource(source) ?: decodeSource(source.invert())
      if (decoded != null && found.compareAndSet(false, true)) {
        runOnUiThread {
          val data = Intent().putExtra(EXTRA_QR_RESULT, decoded)
          setResult(Activity.RESULT_OK, data)
          finish()
        }
      }
    } finally {
      imageProxy.close()
    }
  }

  private fun decodeSource(source: com.google.zxing.LuminanceSource): String? {
    return try {
      val bitmap = BinaryBitmap(HybridBinarizer(source))
      qrReader.decode(bitmap, decodeHints).text
    } catch (_: NotFoundException) {
      null
    } catch (_: Exception) {
      null
    } finally {
      qrReader.reset()
    }
  }

  private fun finishWithError(error: String) {
    val data = Intent().putExtra(EXTRA_QR_ERROR, error)
    setResult(Activity.RESULT_CANCELED, data)
    finish()
  }

  override fun onDestroy() {
    super.onDestroy()
    analysisExecutor.shutdown()
  }

  private fun dp(value: Int): Int {
    return TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      value.toFloat(),
      resources.displayMetrics
    ).toInt()
  }

  companion object {
    const val EXTRA_QR_RESULT = "qr_result"
    const val EXTRA_QR_ERROR = "qr_error"
    const val EXTRA_FLAG_SECURE = "flag_secure"
  }
}

private class ViewfinderOverlayView(context: Context) : View(context) {
  private val scrimPaint = Paint().apply {
    color = Color.argb(165, 0, 0, 0)
  }
  private val clearPaint = Paint().apply {
    xfermode = PorterDuffXfermode(PorterDuff.Mode.CLEAR)
    isAntiAlias = true
  }
  private val borderPaint = Paint().apply {
    color = Color.parseColor("#3B82F6")
    style = Paint.Style.STROKE
    strokeWidth = 6f
    isAntiAlias = true
  }
  private val boxRect = RectF()

  init {
    setLayerType(LAYER_TYPE_SOFTWARE, null)
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), scrimPaint)

    val size = minOf(width, height) * 0.66f
    val left = (width - size) / 2f
    val top = (height - size) / 2f
    val radius = 36f
    boxRect.set(left, top, left + size, top + size)

    canvas.drawRoundRect(boxRect, radius, radius, clearPaint)
    canvas.drawRoundRect(boxRect, radius, radius, borderPaint)
  }
}
