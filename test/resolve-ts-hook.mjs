const HAS_EXT = /\.[a-z0-9]+$/i;

export async function resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !HAS_EXT.test(specifier)) {
        return nextResolve(specifier + '.ts', context);
    }
    if (specifier.startsWith('lodash/') && !HAS_EXT.test(specifier)) {
        return nextResolve(specifier + '.js', context);
    }
    return nextResolve(specifier, context);
}
