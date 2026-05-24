import {defineLocations, type PresentationPluginOptions} from 'sanity/presentation'

const editorial = (segment: 'interviews' | 'news' | 'photos' | 'reviews') =>
  defineLocations({
    select: {
      title: 'title',
      slug: 'slug.current',
    },
    resolve: (doc) => ({
      locations: [
        {
          title: doc?.title || 'Untitled',
          href: `/${segment}/${doc?.slug}`,
        },
        {title: segment[0].toUpperCase() + segment.slice(1), href: `/${segment}`},
        {title: 'Home', href: '/'},
      ],
    }),
  })

export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    interview: editorial('interviews'),
    news: editorial('news'),
    photoPost: editorial('photos'),
    review: editorial('reviews'),
    author: defineLocations({
      select: {
        title: 'name',
        slug: 'slug.current',
      },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title || 'Author',
            href: `/authors/${doc?.slug}`,
          },
          {title: 'Home', href: '/'},
        ],
      }),
    }),
    newsletterIssue: defineLocations({
      select: {
        title: 'title',
        slug: 'slug.current',
      },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title || 'Newsletter',
            href: `/newsletter/${doc?.slug}`,
          },
          {title: 'Newsletter archive', href: '/newsletter'},
          {title: 'Home', href: '/'},
        ],
      }),
    }),
    tag: defineLocations({
      select: {
        title: 'title',
        slug: 'slug.current',
      },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title || 'Tag',
            href: `/tags/${doc?.slug}`,
          },
          {title: 'Home', href: '/'},
        ],
      }),
    }),
  },
}
