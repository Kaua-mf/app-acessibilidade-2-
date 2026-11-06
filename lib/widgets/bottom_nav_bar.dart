import 'package:app_acessibilidade/theme.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Ítem da barra inferior: ícone (emoji grande) + rótulo + emoji menor abaixo.
class _NavItem {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.route,
    this.smallEmoji,
  });
  final String icon;
  final String label;
  final String route;
  final String? smallEmoji;
}

/// Barra de navegação inferior com 3 itens (emojis), espelhando a navegação
/// principal do app original.
class BottomNavBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onTap;

  const BottomNavBar({
    super.key,
    required this.selectedIndex,
    required this.onTap,
  });

  static const List<_NavItem> _items = [
    _NavItem(
      icon: '🎨',
      label: 'Cores',
      route: '/color-detection',
      smallEmoji: 'cor',
    ),
    _NavItem(
      icon: '💡',
      label: 'Luz',
      route: '/light-detection',
      smallEmoji: 'luz',
    ),
    _NavItem(
      icon: '⚙️',
      label: 'Calibração',
      route: '/calibration',
      smallEmoji: 'ajustes',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      backgroundColor: AppColors.black,
      type: BottomNavigationBarType.fixed,
      currentIndex: selectedIndex,
      onTap: (i) {
        GoRouter.of(context).go(_items[i].route);
        onTap(i);
      },
      selectedItemColor: AppColors.yellow,
      unselectedItemColor: AppColors.grayLight,
      items: _items.asMap().entries.map((entry) {
        final idx = entry.key;
        final item = entry.value;
        final active = idx == selectedIndex;
        return BottomNavigationBarItem(
          icon: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                item.icon,
                style: TextStyle(
                  fontSize: active ? 30 : 24,
                  color: active ? AppColors.yellow : AppColors.grayLight,
                ),
              ),
              if (item.smallEmoji != null)
                Text(
                  item.smallEmoji!,
                  style: TextStyle(
                    fontSize: 10,
                    color: active ? AppColors.yellow : AppColors.grayDark,
                  ),
                ),
            ],
          ),
          label: item.label,
        );
      }).toList(),
    );
  }
}
