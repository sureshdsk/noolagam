import 'package:flutter/material.dart';

class TtsControls extends StatelessWidget {
  final VoidCallback play;

  final VoidCallback pause;

  final VoidCallback stop;

  final VoidCallback resume;

  final double speed;

  final ValueChanged<double> onSpeedChanged;

  const TtsControls({
    super.key,
    required this.play,
    required this.pause,
    required this.stop,
    required this.resume,
    required this.speed,
    required this.onSpeedChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,

      margin: const EdgeInsets.all(15),

      child: Padding(
        padding: const EdgeInsets.all(15),

        child: Column(
          children: [
            const Text(
              "🔊 கேட்டு மகிழ்",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
            ),

            const SizedBox(height: 15),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,

              children: [
                IconButton(
                  icon: const Icon(Icons.play_arrow),
                  iconSize: 35,
                  onPressed: play,
                ),

                IconButton(
                  icon: const Icon(Icons.pause),
                  iconSize: 35,
                  onPressed: pause,
                ),

                IconButton(
                  icon: const Icon(Icons.play_circle),
                  iconSize: 35,
                  onPressed: resume,
                ),

                IconButton(
                  icon: const Icon(Icons.stop),
                  iconSize: 35,
                  onPressed: stop,
                ),
              ],
            ),

            const SizedBox(height: 20),

            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "ஒலி வேகம்",
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),

            Slider(
              value: speed,

              min: 0.5,

              max: 2.0,

              divisions: 6,

              label: "${speed.toStringAsFixed(1)}x",

              onChanged: onSpeedChanged,
            ),
          ],
        ),
      ),
    );
  }
}
