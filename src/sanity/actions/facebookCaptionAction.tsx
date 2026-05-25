'use client'

import {ShareIcon} from '@sanity/icons'
import {useRef, useState} from 'react'
import type {DocumentActionComponent} from 'sanity'

import {FacebookCaptionDialog} from '@/sanity/components/FacebookCaptionDialog'

function closeDialog(setDialogOpen: (open: boolean) => void) {
  setDialogOpen(false)
}

export const GenerateFacebookCaptionAction: DocumentActionComponent = (props) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const published = props.published
  const saveBeforeCloseRef = useRef<(() => Promise<void>) | null>(null)

  const handleClose = () => closeDialog(setDialogOpen)

  const handleDialogClose = () => {
    void (async () => {
      try {
        await saveBeforeCloseRef.current?.()
      } finally {
        handleClose()
      }
    })()
  }

  return {
    label: 'Facebook Caption',
    icon: ShareIcon,
    disabled: !published,
    title: !published ? 'Publish the article before generating a Facebook Caption' : undefined,
    onHandle: () => {
      setDialogOpen(true)
    },
    dialog: dialogOpen
      ? {
          type: 'dialog' as const,
          onClose: handleDialogClose,
          header: 'Facebook Caption',
          content: (
            <FacebookCaptionDialog
              documentId={props.id}
              onClose={handleClose}
              registerBeforeClose={(fn) => {
                saveBeforeCloseRef.current = fn
              }}
            />
          ),
        }
      : null,
  }
}
