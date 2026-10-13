# Outil de développement : remplace les caractères invisibles (combinants, espaces spéciaux,
# U+FFFD…) par des séquences \uXXXX dans les fichiers source donnés, pour que les regex restent lisibles.
import sys
BS = chr(92)
CODES = {0xa0, 0x202f, 0x2009, 0x2bc, 0xb4, 0xfffd}
for p in sys.argv[1:]:
    s = open(p, encoding='utf-8').read()
    out = ''.join(BS + 'u%04x' % ord(c) if (0x300 <= ord(c) <= 0x36f or ord(c) in CODES) else c for c in s)
    open(p, 'w', encoding='utf-8', newline='\n').write(out)
