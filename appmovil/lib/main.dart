import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

void main() {
  runApp(const VelocimetroApp());
}

class VelocimetroApp extends StatelessWidget {
  const VelocimetroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Velocímetro GPS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00E5FF),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0B0F14),
      ),
      home: const SpeedometerPage(),
    );
  }
}

class SpeedometerPage extends StatefulWidget {
  const SpeedometerPage({super.key});

  @override
  State<SpeedometerPage> createState() => _SpeedometerPageState();
}

class _SpeedometerPageState extends State<SpeedometerPage> {
  StreamSubscription<Position>? _positionSub;

  double _speedKmh = 0; // velocidad actual
  double _maxSpeedKmh = 0; // velocidad máxima
  double _distanceMeters = 0; // distancia acumulada
  final Stopwatch _stopwatch = Stopwatch(); // tiempo de recorrido

  Position? _lastPosition;
  String _status = 'Detenido';
  bool _tracking = false;
  String? _error;

  @override
  void dispose() {
    _positionSub?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() {
      _error = null;
      _status = 'Solicitando permisos...';
    });

    // 1. Servicio de ubicación activo?
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      setState(() {
        _error = 'Activa el GPS del dispositivo para continuar.';
        _status = 'GPS desactivado';
      });
      return;
    }

    // 2. Permisos
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      setState(() {
        _error = permission == LocationPermission.deniedForever
            ? 'Permiso de ubicación denegado permanentemente. Actívalo en Ajustes.'
            : 'Permiso de ubicación denegado.';
        _status = 'Sin permiso';
      });
      return;
    }

    // Reset de métricas
    setState(() {
      _speedKmh = 0;
      _maxSpeedKmh = 0;
      _distanceMeters = 0;
      _lastPosition = null;
      _tracking = true;
      _status = 'Buscando señal GPS...';
    });
    _stopwatch
      ..reset()
      ..start();

    const settings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 0,
    );

    _positionSub = Geolocator.getPositionStream(locationSettings: settings)
        .listen(_onPosition, onError: (e) {
      setState(() => _error = 'Error de GPS: $e');
    });
  }

  void _stop() {
    _positionSub?.cancel();
    _positionSub = null;
    _stopwatch.stop();
    setState(() {
      _tracking = false;
      _speedKmh = 0;
      _status = 'Detenido';
    });
  }

  void _reset() {
    _positionSub?.cancel();
    _positionSub = null;
    _stopwatch
      ..stop()
      ..reset();
    setState(() {
      _tracking = false;
      _speedKmh = 0;
      _maxSpeedKmh = 0;
      _distanceMeters = 0;
      _lastPosition = null;
      _status = 'Listo';
      _error = null;
    });
  }

  void _onPosition(Position pos) {
    double speed = pos.speed; // m/s

    // Si el dispositivo no reporta speed o es negativo, calculamos por delta.
    if (speed.isNaN || speed < 0) {
      speed = 0;
    }
    if (speed == 0 && _lastPosition != null) {
      final dt =
          (pos.timestamp.millisecondsSinceEpoch -
                  _lastPosition!.timestamp.millisecondsSinceEpoch) /
              1000.0;
      if (dt > 0) {
        final d = Geolocator.distanceBetween(
          _lastPosition!.latitude,
          _lastPosition!.longitude,
          pos.latitude,
          pos.longitude,
        );
        speed = d / dt;
      }
    }

    final speedKmh = speed * 3.6;

    double addedDistance = 0;
    if (_lastPosition != null) {
      final d = Geolocator.distanceBetween(
        _lastPosition!.latitude,
        _lastPosition!.longitude,
        pos.latitude,
        pos.longitude,
      );
      // Ignorar saltos absurdos (>100 m entre lecturas) por ruido del GPS.
      if (d < 100) addedDistance = d;
    }

    setState(() {
      _speedKmh = speedKmh.clamp(0, 999);
      if (_speedKmh > _maxSpeedKmh) _maxSpeedKmh = _speedKmh;
      _distanceMeters += addedDistance;
      _lastPosition = pos;
      _status = 'Midiendo';
    });
  }

  String _formatTime() {
    final d = _stopwatch.elapsed;
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final km = (_distanceMeters / 1000.0);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.speed, color: Color(0xFF00E5FF)),
                  const SizedBox(width: 8),
                  const Text(
                    'Velocímetro GPS',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  Text(
                    _status,
                    style: TextStyle(color: Colors.white.withOpacity(0.6)),
                  ),
                ],
              ),
              const Spacer(),
              _Gauge(speedKmh: _speedKmh, maxKmh: math.max(_maxSpeedKmh, 1)),
              const SizedBox(height: 8),
              Text(
                _speedKmh.toStringAsFixed(0),
                style: const TextStyle(
                  fontSize: 84,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  height: 1,
                ),
              ),
              const Text(
                'km/h',
                style: TextStyle(fontSize: 20, color: Color(0xFF00E5FF)),
              ),
              const Spacer(),
              Row(
                children: [
                  _MetricBox(
                    icon: Icons.trending_up,
                    label: 'Máxima',
                    value: '${_maxSpeedKmh.toStringAsFixed(0)} km/h',
                  ),
                  _MetricBox(
                    icon: Icons.route,
                    label: 'Distancia',
                    value: '${km.toStringAsFixed(2)} km',
                  ),
                  _MetricBox(
                    icon: Icons.timer,
                    label: 'Tiempo',
                    value: _formatTime(),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B1D1D),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF87171)),
                  ),
                  child: Text(_error!,
                      style: const TextStyle(color: Color(0xFFF87171))),
                ),
              ],
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _tracking ? _stop : _start,
                      icon: Icon(_tracking ? Icons.pause : Icons.play_arrow),
                      label: Text(_tracking ? 'Detener' : 'Iniciar'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor:
                            _tracking ? const Color(0xFFF87171) : null,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: _reset,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reiniciar'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          vertical: 16, horizontal: 18),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Aguja del velocímetro dibujada con CustomPainter.
class _Gauge extends StatelessWidget {
  const _Gauge({required this.speedKmh, required this.maxKmh});

  final double speedKmh;
  final double maxKmh;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      height: 240,
      child: CustomPaint(
        painter: _GaugePainter(speedKmh: speedKmh, maxKmh: maxKmh),
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  _GaugePainter({required this.speedKmh, required this.maxKmh});

  final double speedKmh;
  final double maxKmh;

  // Escala del medidor: hasta 180 km/h o la máxima real, lo que sea mayor.
  double get _scaleMax => math.max(180, (maxKmh / 20).ceil() * 20);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 16;

    // Arco de fondo (de 135° a 405°, es decir 270°).
    const startAngle = 135 * math.pi / 180;
    const sweep = 270 * math.pi / 180;

    final bgPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round
      ..color = const Color(0xFF1E293B);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweep,
      false,
      bgPaint,
    );

    // Arco de progreso
    final fraction = (speedKmh / _scaleMax).clamp(0.0, 1.0);
    final progPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round
      ..shader = const SweepGradient(
        colors: [Color(0xFF00E5FF), Color(0xFF34D399), Color(0xFFFBBF24)],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweep * fraction,
      false,
      progPaint,
    );

    // Aguja
    final angle = startAngle + sweep * fraction;
    final needlePaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    final needleEnd = Offset(
      center.dx + (radius - 18) * math.cos(angle),
      center.dy + (radius - 18) * math.sin(angle),
    );
    canvas.drawLine(center, needleEnd, needlePaint);
    canvas.drawCircle(center, 8, Paint()..color = Colors.white);
    canvas.drawCircle(center, 4, Paint()..color = const Color(0xFF0B0F14));
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) =>
      old.speedKmh != speedKmh || old.maxKmh != maxKmh;
}

class _MetricBox extends StatelessWidget {
  const _MetricBox({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF151C24),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF22303F)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: const Color(0xFF00E5FF)),
            const SizedBox(height: 6),
            Text(
              value,
              style: const TextStyle(
                  fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                  fontSize: 11, color: Colors.white.withOpacity(0.6)),
            ),
          ],
        ),
      ),
    );
  }
}
