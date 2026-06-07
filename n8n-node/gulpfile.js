const { src, dest } = require('gulp');

// Copy node/credential icons (svg/png) into dist, preserving the nodes/ tree
// so the compiled `file:...svg` icon references resolve at runtime.
function buildIcons() {
	return src('nodes/**/*.{png,svg}', { encoding: false }).pipe(dest('dist/nodes'));
}

exports['build:icons'] = buildIcons;
