import {author} from './author'
import {eventArchive} from './eventArchive'
import {eventSpotifyCuration} from './eventSpotifyCuration'
import {spotifyArtistMatch} from './spotifyArtistMatch'
import {venueImage} from './venueImage'
import {instagramEmbed} from './instagramEmbed'
import {interview} from './interview'
import {news} from './news'
import {newsletterIssue} from './newsletterIssue'
import {review} from './review'
import {siteSettings} from './siteSettings'
import {tag} from './tag'

export const schemaTypes = [
  eventArchive,
  eventSpotifyCuration,
  spotifyArtistMatch,
  venueImage,
  siteSettings,
  tag,
  author,
  instagramEmbed,
  interview,
  news,
  newsletterIssue,
  review,
]
