///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github.lalyos:jfiglet:0.0.8

import com.github.lalyos.jfiglet.FigletFont;

class jbanner {

    public static void main(String... args) throws Exception {
        if (args.length>0) {
            System.out.println(FigletFont.convertOneLine( args[0] ));
	}
	else {
            System.out.println( "usage: jbanner <MESSAGE>" );
	}
    }
}
