import 'package:flutter_test/flutter_test.dart';

import 'package:velocimetro/main.dart';

void main() {
  testWidgets('La app arranca y muestra el velocímetro',
      (WidgetTester tester) async {
    await tester.pumpWidget(const VelocimetroApp());

    expect(find.text('Velocímetro GPS'), findsOneWidget);
    expect(find.text('km/h'), findsOneWidget);
    expect(find.text('Iniciar'), findsOneWidget);
  });
}
